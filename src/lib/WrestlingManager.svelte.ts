import type { 
  WStateMain, 
  WConfig, 
  WStateSide, 
  WPos, 
  WSide, 
  WHistory,
  SideColor,
  WAction,
  ClockId,
  ClockEvent,
  WClockPhases,
  WPeriod,
  WNameUpdate,
  WWinTypeCode,
} from "@/types";
import { 
  cnsActions,
  cnsColors, 
  cnsThresholds, 
  getCnsClock, 
  getCnsPeriods, 
  type ActionEntry, 
  type TimersEntry 
} from "@/constants/wrestling.constants";
import { ZonkClock } from "./ZonkClock";
import { RidingClock } from "./RidingClock";
import { co } from "./console";
import { broadcast } from "./broadcast.svelte";
import { generateId } from "./math";

const getSideState = (color: SideColor): WStateSide => {
  return {
    color: color,
    pos: 'n',
    team: { name: '', abbreviation: '' },
    athlete: { firstName: '', lastName: '' },
    winTypeCode: null,
    clocks: {}
  };
};

const placeholderState: WStateMain = {
  config: {
    style: "Greco", 
    age: undefined,
    periodLengths: [120],
    team: false
  },
  clockInfo: {
    activeId: '',
    lastActivatedId: '',
    lastActivatedAction: '',
  },
  clocks: { mc: new ZonkClock(0) },
  l: getSideState('red'),
  r: getSideState('green'),
  periods: [],
  periodIdx: 0,
};


/**
 * Table of Contents
 * 1. members and constructor
 * 2. Broadcast methods
 * 3. Initialize
 * 4. Clock Management
 * 5. Action management
 * 6. Action Switch/Delete/Recompute
 * 6.5. WinBy
 * 7. Advance periods or matches
 * 8. Scoring
 * 9. Position and Color
 * 10. Riding Clock
 * 11. Team/Athlete
 * 12. Bout Number
 * 90. Utility Methods
 * 99. Cleanup
 */
export class WrestlingManager {


  // ++++++++++++++++++++++++ 1. members and constructor ++++++++++++++++++++++++

  private static instance: WrestlingManager | null = null;
  
  private _current = $state<WStateMain>({...placeholderState});
  private _history = $state<WHistory>({ matches: [], });
  private _clockPhases = $state<WClockPhases>();
  private config: WConfig | null = null;
  private initialized = false;
  private actionTitleMap: Map<string, ActionEntry> = new Map<string, ActionEntry>();
  private broadcastUnsubscribes: (() => void)[] = [];

  private constructor() {
    // prevent direct instantiation
  }

  static getInstance(): WrestlingManager {
    if (!WrestlingManager.instance) {
      WrestlingManager.instance = new WrestlingManager();
    }
    return WrestlingManager.instance;
  }

  // getters
  get current(): WStateMain {
    if (!this.initialized) {
      co.warn("WrestlingManager: Accessing state before initialization or Period not ready");
    }

    return this._current;
  }

  get mustChoosePosition(): boolean {

    let mustChoosePosition: boolean = false;
    const currentPeriod = this.getCurrentPeriod();
    const matchPoints = this.getPointsForMatch();

    if (!!currentPeriod) {
      mustChoosePosition = 
        // this.peekStoreValue(this._current.clocks.mc.isComplete) &&
        currentPeriod.definition.whoChooses !== "none" &&
        !currentPeriod.positionChoice &&
        ( // 
          !currentPeriod.definition.decisive ||
          matchPoints.l === matchPoints.r
        );
    } else {
      co.warn("WrestlingManager: Cannot compute mustChoosePosition");
    }

    return mustChoosePosition;
  }

  get whoCanChooseSides(): { l: boolean; r: boolean; } | undefined {
    const currentPeriod = this.getCurrentPeriod();
    const mustChoose = this.mustChoosePosition;
    
    if (!mustChoose || !currentPeriod) {
      return undefined;
    }

    return this.determineWhoCanChoosePosition();
  }

  get clockPhases(): WClockPhases | undefined {
    return this._clockPhases;
  }

  get history(): WHistory {
    return this._history;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  // ++++++++++++++++++++++++ 2. Broadcast methods ++++++++++++++++++++++++

  private setupBroadcastHandlers() {
    const unsubControl = broadcast.listen('control', (message) => {
      if (message === 'request_data') {
        co.debug('Scoreboard requesting data, sending current state');
        this.broadcastCurrentState();
      }
    });
    this.broadcastUnsubscribes.push(unsubControl);
  }

  private broadcastCurrentState() {
    if (!this.initialized) return;

    const pl = {
      ...this._current,
      matchPoints: this.getPointsForMatch(),
    };
    
    broadcast.sendState('state', pl);
  }

  private cleanupBroadcast() {
    this.broadcastUnsubscribes.forEach(unsub => unsub());
    this.broadcastUnsubscribes = [];
  }

  // ++++++++++++++++++++++++ 3. Initialize ++++++++++++++++++++++++

  initializeMatch(config: WConfig) {
    this.config = config;
    this.initialize();
    this.initialized = true;
    
    // Broadcast initial state
    this.broadcastCurrentState();
    this.setupBroadcastHandlers();
  }

  private initialize() { 
    if (!this.config) {
      co.error("WrestlingManager: Cannot initialize without config");
      return;
    }

    // 0. Get constants
    const timeConstants = getCnsClock(this.config);
    const periodConstants = getCnsPeriods(this.config);
    if (!timeConstants) {
      co.error("Wrestling Manager initialize: could not retrieve clock time constants");
      return;
    }
    if (!periodConstants) {
      co.error("Wrestling Manager initialize: could not retrieve period constants");
      return;
    }

    // 1. Set action map
    const allActions = cnsActions[this.config.style];
    this.actionTitleMap = new Map<string, ActionEntry>();
    [...allActions].forEach(action => {
      this.actionTitleMap.set(action.code, action);
    });

    // 2. Clock setup
    this.destroyMainClocks();
    
    // Main clock
    const firstPeriodMs = (this.config.periodLengths[0]) * 1000;
    this._current.clocks.mc = new ZonkClock(firstPeriodMs);
    
    // Riding clock (only for folkstyle college)
    if (timeConstants.rt === true) {
      this._current.clocks.ride = new RidingClock();
      co.info("WrestlingManager: Riding clock initialized for Folkstyle College");
    }
    
    // Shot clock
    if (!!timeConstants.sc) {
      const scMs = timeConstants.sc * 1000;
      this._current.clocks.shotclock = new ZonkClock(scMs);
    }

    // Rest clock (if needed)
    if (!!timeConstants.twP) {
      const restMs = timeConstants.twP * 1000;
      this._current.clocks.rest = new ZonkClock(restMs);
    }

    // 3. Periods setup
    this._current.periods = [];
    periodConstants.forEach((p, idx) => {
      const cnfLen = this.config!.periodLengths[idx] ?? null;
      const cnsLen = timeConstants[p.code as keyof TimersEntry] as number ?? null;
      
      this._current.periods.push({
        seconds: cnfLen || cnsLen || 120,
        displayIdx: idx,
        realIdx: idx,
        definition: p,
        actions: [],
      })
    });

    // 4. Colors and sides
    const colorConstants = cnsColors[this.config.style];
    let lColor: SideColor = 'red', rColor: SideColor = 'green';
    if (colorConstants) {
      lColor = colorConstants.left;
      rColor = colorConstants.right;
    }
    this._current.l = getSideState(lColor);
    this._current.r = getSideState(rColor);
    this.initializeSideClocks(timeConstants);

    this.resetClockPhases();
    
    // 5. Remaining fields
    this._current.config = this.config;
    this._current.clockInfo = {
      activeId: 'mc',
      lastActivatedId: '',
      lastActivatedAction: '',
    };
    this._current.periodIdx = 0;

    co.fire("+++++++++ WrestlingManager: Match initialized +++++++++", {
      style: this.config.style,
      age: this.config.age,
      periodsCount: this._current.periods.length,
      hasRidingClock: !!this._current.clocks.ride
    });

    co.table(this._current.periods.map(p => ({
      index: p.displayIdx,
      name: p.definition.name,
      seconds: p.seconds,
      decisive: p.definition.decisive,
      whoChooses: p.definition.whoChooses
    })), "Periods");
  }

  private initializeSideClocks(timeConstants: TimersEntry) {
    this.destroySideClocks();

    if (!!timeConstants.bl) {
      this._current.l.clocks.blood = new ZonkClock(timeConstants.bl * 1000);
      this._current.r.clocks.blood = new ZonkClock(timeConstants.bl * 1000);
    }
    if (!!timeConstants.hn) {
      this._current.l.clocks.headneck = new ZonkClock(timeConstants.hn * 1000);
      this._current.r.clocks.headneck = new ZonkClock(timeConstants.hn * 1000);
    }
    if (!!timeConstants.in) {
      this._current.l.clocks.injury = new ZonkClock(timeConstants.in * 1000);
      this._current.r.clocks.injury = new ZonkClock(timeConstants.in * 1000);
    }
    if (!!timeConstants.rc) {
      this._current.l.clocks.recovery = new ZonkClock(timeConstants.rc * 1000);
      this._current.r.clocks.recovery = new ZonkClock(timeConstants.rc * 1000);
    }
  }

  // ++++++++++++++++++++++++ 4. Clock management ++++++++++++++++++++++++

  resetClockPhases(): void {
    this._clockPhases = {
      mc: 'reset',
      rest: this._current.clocks.rest ? 'reset' : 'unknown',
      shotclock: this._current.clocks.shotclock ? 'reset' : 'unknown',
      l: {
        blood: this._current.l.clocks.blood ? 'reset' : 'unknown',
        injury: this._current.l.clocks.injury ? 'reset' : 'unknown',
        recovery: this._current.l.clocks.recovery ? 'reset' : 'unknown',
        headneck: this._current.l.clocks.headneck ? 'reset' : 'unknown',
      },
      r: {
        blood: this._current.r.clocks.blood ? 'reset' : 'unknown',
        injury: this._current.r.clocks.injury ? 'reset' : 'unknown',
        recovery: this._current.r.clocks.recovery ? 'reset' : 'unknown',
        headneck: this._current.r.clocks.headneck ? 'reset' : 'unknown',
      },
    }
  }

  updateClockPhase(clockId: ClockId, event: ClockEvent): void {
    const [prefix, suffix] = clockId.split('_');

    if (!this._clockPhases)
      return;

    if (suffix && (prefix === 'l' || prefix === 'r')) {
      this._clockPhases[prefix][suffix as keyof WClockPhases['l']] = event;
    } else {
      if (prefix === 'mc' || prefix === 'rest' || prefix === 'shotclock')
      this._clockPhases[prefix] = event;
    }
  }

  startClock(clockId: string): void {
    const clock = this.getClockById(clockId);
    if (clock) {
      this.stopActiveClock();
      
      if (clock instanceof RidingClock) {
        // Riding clock needs position to determine which side is on top
        const leftPos = this._current.l.pos;
        if (leftPos === 't') {
          clock.startForSide('l');
          co.info("WrestlingManager: Started riding clock for left (top)");
        } else if (leftPos === 'b') {
          clock.startForSide('r');
          co.info("WrestlingManager: Started riding clock for right (top)");
        } else {
          co.info("WrestlingManager: Cannot start riding clock - neutral position");
          return; // Don't start for neutral position
        }
      } else {
        clock.start();
      }
      
      this._current.clockInfo.activeId = clockId;
      this._current.clockInfo.lastActivatedId = clockId;
      this._current.clockInfo.lastActivatedAction = 'start';
      
      // Also start riding clock if main clock starts and riding clock exists
      if (clockId === 'mc' && this._current.clocks.ride) {
        const leftPos = this._current.l.pos;
        if (leftPos === 't') {
          this._current.clocks.ride.startForSide('l');
        } else if (leftPos === 'b') {
          this._current.clocks.ride.startForSide('r');
        }
      }
      
      // Broadcast clock start
      const timeLeft = clock instanceof RidingClock ? 0 : clock.getRemainingTime();
      // broadcastClockStart(clockId, timeLeft);
      this.broadcastCurrentState();
    }
  }

  stopClock(clockId: string): void {
    const clock = this.getClockById(clockId);
    if (clock) {
      clock.stop();
      
      if (this._current.clockInfo.activeId === clockId) {
        this._current.clockInfo.activeId = '';
      }
      this._current.clockInfo.lastActivatedAction = 'stop';
      
      // Also stop riding clock if main clock stops
      if (clockId === 'mc' && this._current.clocks.ride) {
        this._current.clocks.ride.stop();
      }
      
      // Broadcast clock stop
      // broadcastClockStop(clockId);
      this.broadcastCurrentState();
    }
  }

  resetClock(clockId: ClockId): void {
    const currentPeriod = this.getCurrentPeriod();
    const clock = this.getClockById(clockId);
    if (!!currentPeriod && !!clock) {
      const resetTime = currentPeriod.seconds * 1000;
      clock.reset(resetTime);
      this._current.clockInfo.lastActivatedAction = 'reset';
      
      this.broadcastCurrentState();
    }
    this.updateClockPhase(clockId, "reset");
  }

  setClockTime(clockId: string, newTimeMs: number): void {
    if (clockId === 'ride') {
      // For riding clock, set the net time directly
      const rideClock = this._current.clocks.ride;
      if (rideClock) {
        rideClock.setNetTime(newTimeMs);
        this.broadcastCurrentState();
      }
    } else {
      // For other clocks, replace with new ZonkClock
      this.setClockById(clockId, new ZonkClock(newTimeMs));
      this.broadcastCurrentState();
    }
  }

  private stopActiveClock(): void {
    if (this._current.clockInfo.activeId) {
      const activeClock = this.getClockById(this._current.clockInfo.activeId);
      activeClock?.stop();
      
      // Also stop riding clock
      if (this._current.clockInfo.activeId === 'mc' && this._current.clocks.ride) {
        this._current.clocks.ride.stop();
      }
    }
  }

  private getClockById(clockId: string): ZonkClock | RidingClock | undefined {
    if (clockId === 'mc') return this._current.clocks.mc;
    if (clockId === 'rest') return this._current.clocks.rest;
    if (clockId === 'shotclock') return this._current.clocks.shotclock;
    if (clockId === 'ride') return this._current.clocks.ride;
    
    // Handle side clocks (format: "left_blood", "right_injury", etc.)
    const [side, clockType] = clockId.split('_');
    if (side === 'left' || side === 'l') {
      return this._current.l.clocks[clockType as keyof typeof this._current.l.clocks];
    }
    if (side === 'right' || side === 'r') {
      return this._current.r.clocks[clockType as keyof typeof this._current.r.clocks];
    }
    
    return undefined;
  }

  private setClockById(clockId: string, newClock: ZonkClock | RidingClock): boolean {
    if (clockId === 'mc') {
      this._current.clocks.mc = newClock as ZonkClock;
      return true;
    }
    if (clockId === 'rest') {
      this._current.clocks.rest = newClock as ZonkClock;
      return true;
    }
    if (clockId === 'shotclock') {
      this._current.clocks.shotclock = newClock as ZonkClock;
      return true;
    }
    if (clockId === 'ride') {
      this._current.clocks.ride = newClock as RidingClock;
      return true;
    }
    
    // Handle side clocks
    const [side, clockType] = clockId.split('_');
    if (side === 'left' || side === 'l') {
      if (clockType in this._current.l.clocks) {
        this._current.l.clocks[clockType as keyof typeof this._current.l.clocks] = newClock as ZonkClock;
        return true;
      }
    }
    if (side === 'right' || side === 'r') {
      if (clockType in this._current.r.clocks) {
        this._current.r.clocks[clockType as keyof typeof this._current.r.clocks] = newClock as ZonkClock;
        return true;
      }
    }
    
    return false;
  }

  handleClockComplete(id: ClockId) {
    const clock = this.getClockById(id);
    if (!!clock && clock instanceof ZonkClock) {
      const actn: WAction = {
        id: generateId(),
        clock: {
          clockId: id,
          event: "complete",
          timeLeft: 0,
        },
        ts: Date.now(),
        elapsed: this.peekStoreValue(clock.elapsed),
      }
      this.processAction(actn);
    } else {
      co.error(`handleClockComplete: clock not found:`, id);
      return;
    }
  }

  // ++++++++++++++++++++++++ 5. Action management ++++++++++++++++++++++++

  getAllActions(): WAction[] {
    return this._current.periods.flatMap(p => p.actions);
  }

  getActionById(actionId: string): 
    { action: WAction; periodIndex: number; actionIndex: number } | null 
  {
    for (let periodIndex = 0; periodIndex < this._current.periods.length; periodIndex++) {
      const period = this._current.periods[periodIndex];
      for (let actionIndex = 0; actionIndex < period.actions.length; actionIndex++) {
        if (period.actions[actionIndex].id === actionId) {
          return {
            action: period.actions[actionIndex],
            periodIndex,
            actionIndex
          };
        }
      }
    }
    return null;
  }
  
  private countActionsBySide(side: WSide, actionCode: string): number {
    return this.getAllActions()
      .filter(action => 
        action.wrestle?.side === side && 
        action.wrestle?.action === actionCode
      ).length;
  }

  processAction(actn: WAction) {
    if (!this._current.periods[this._current.periodIdx]) {
      co.warn("WrestlingManager: No current period to add action to");
      return;
    }

    
    if (actn.wrestle) { // wrestle event

      // Add elapsed time ( time events set their own elapsed time )
      const mainClockElapsed = this._current.clocks.mc.getTotalElapsed();
      actn.elapsed = Math.floor(mainClockElapsed / 1000);

      // Prevent negative scores for manual actions
      if (actn.wrestle.action === "manual") {
        const matchPoints = this.getPointsForMatch();
        if (matchPoints[actn.wrestle.side] + actn.wrestle.pt < 0) {
          co.warn("WrestlingManager: Cannot make score negative with manual action");
          return;
        }
      }

      const actionCount = this.countActionsBySide(actn.wrestle.side, actn.wrestle.action);
      actn.wrestle.cnt = actionCount + 1;
      
      // Add info from constants (manual actions don't exist in constants)
      const selectedAction = this.actionTitleMap.get(actn.wrestle.action);
      if (selectedAction) {
        // Set points
        if (selectedAction.points) {
          actn.wrestle.pt = selectedAction.points[0] as number;
        }
        
        // Set opponent points (penalties)
        if (selectedAction.oppPoints) {
          actn.wrestle.clean = false;
          let oppPtValue: number | 'dq' = 0;

          if (actn.wrestle.cnt <= selectedAction.oppPoints.length) {
            oppPtValue = selectedAction.oppPoints[actn.wrestle.cnt - 1];
          } else {
            oppPtValue = selectedAction.oppPoints[selectedAction.oppPoints.length - 1];
          }

          if (oppPtValue === 'dq') {
            actn.wrestle.dq = true;
            actn.wrestle.oppPt = 0;
          } else {
            actn.wrestle.oppPt = oppPtValue;
          }
        }

        // Set resulting position
        if (selectedAction.resultingPos) {
          actn.wrestle.newPos = selectedAction.resultingPos;
        }

        actn.wrestle.actionTitle = selectedAction.title;
      }

      co.info("WrestlingManager: Processing action", {
        side: actn.wrestle.side,
        action: actn.wrestle.action,
        points: actn.wrestle.pt,
        oppPoints: actn.wrestle.oppPt,
        newPos: actn.wrestle.newPos
      });
      
      // Add action to current period
      this._current.periods[this._current.periodIdx].actions.push(actn);
      
      // Update position if action results in position change
      if (actn.wrestle.newPos) {
        this.setPosition(actn.wrestle.side, actn.wrestle.newPos);
      }
      


    } else if (actn.clock) { // clock event

      if (actn.clock.event === "complete") {
        if (actn.clock.clockId === "mc") {
          this.stopRidingClockMaybe();
          this.processPeriodComplete();
          // play audio
        }

        else if (actn.clock.clockId === "shotclock") {

        }
        else if (actn.clock.clockId === "rest") {

        }
        else {
          const [side, clockType] = actn.clock.clockId.split('_');
          // disqualify side
        }


      }
    }
    
    this.broadcastCurrentState();
  }

  // ++++++++++++++++++++++++ 6. Action Switch/Delete/Recompute ++++++++++++++++++++++++

  private recomputeActionCounts(): void {
    // First pass: Count actions by side and type
    const actionCounts = new Map<string, number>(); // key: `${side}_${actionCode}`
    
    // Process all actions in chronological order to rebuild counts
    for (const period of this._current.periods) {
      for (const action of period.actions) {
        if (!action.wrestle) continue;
        
        const key = `${action.wrestle.side}_${action.wrestle.action}`;
        const currentCount = actionCounts.get(key) || 0;
        const newCount = currentCount + 1;
        actionCounts.set(key, newCount);
        
        // Update the action's count
        action.wrestle.cnt = newCount;
        
        // Recompute derived properties based on new count
        this.recomputeActionProperties(action, newCount);
      }
    }
    
    co.debug("Action counts recomputed", Object.fromEntries(actionCounts));
  }

  // recompute for single action
  private recomputeActionProperties(action: WAction, count: number): void {
    if (!action.wrestle) return;
    
    const selectedAction = this.actionTitleMap.get(action.wrestle.action);
    if (!selectedAction) return;

    // Reset derived properties
    action.wrestle.oppPt = 0;
    action.wrestle.dq = false;

    // Recompute opponent points for violation-type actions
    if (selectedAction.oppPoints && selectedAction.oppPoints.length > 0) {
      action.wrestle.clean = false;
      
      let oppPtValue: number | 'dq' = 0;
      if (count <= selectedAction.oppPoints.length) {
        oppPtValue = selectedAction.oppPoints[count - 1];
      } else {
        // Use the last value for counts beyond the array length
        oppPtValue = selectedAction.oppPoints[selectedAction.oppPoints.length - 1];
      }
      

      if (oppPtValue === 'dq') {
        action.wrestle.dq = true;
        action.wrestle.oppPt = 0;
      } else {
        action.wrestle.oppPt = oppPtValue;
      }

    }
  }

  switchActionSide(actionId: string): boolean {
    const result = this.getActionById(actionId);
    if (!result) return false;

    const { action } = result;
    if (!action.wrestle)
      return false;
    const newSide: WSide = action.wrestle.side === "l" ? "r" : "l";
    action.wrestle.side = newSide;

    this.recomputeActionCounts();
    
    co.info("WrestlingManager: Switched action side", { actionId, newSide });
    this.broadcastCurrentState();
    return true;
  }

  deleteAction(actionId: string): boolean {
    const result = this.getActionById(actionId);
    if (!result) return false;
    
    const { periodIndex, actionIndex } = result;
    this._current.periods[periodIndex].actions.splice(actionIndex, 1);

    this.recomputeActionCounts();
    
    co.info("WrestlingManager: Deleted action", { actionId });
    this.broadcastCurrentState();
    return true; 
  }


  // ++++++++++++++++++++++++ 6.5 WinBy ++++++++++++++++++++++++

  updateWinby(side: WSide, code: WWinTypeCode | null): void {
    if (code !== null) {
      const oppSide: WSide = side === "l" ? "r" : "l";
      this._current[oppSide].winTypeCode = null;
    }
    this._current[side].winTypeCode = code;
  }

  resetWinby(): void {
    this._current.l.winTypeCode = null;
    this._current.r.winTypeCode = null;
  }

  // ++++++++++++++++++++++++ 7. Advance periods or matches ++++++++++++++++++++++++

  getPreviousPeriod(): WPeriod | undefined {
    return this._current.periods.
      find(p => p.realIdx === this._current.periodIdx - 1);
  }
  getCurrentPeriod(): WPeriod | undefined {
    return this._current.periods.
      find(p => p.realIdx === this._current.periodIdx);
  }

  isMatchComplete(): boolean {
    // Basic logic - can be expanded
    const points = this.getPointsForMatch();
    return points.l >= 15 || points.r >= 15; // Tech fall example
  }

  private _evalPointDifference(): { 
    tie: boolean; 
    winnerSide: WSide | null; 
    winType: WWinTypeCode | null; 
  } {
    const { l, r } = this.getPointsForMatch();
    const pd = Math.abs(l - r);
    let tie: boolean | null = null;
    let winnerSide: WSide | null = null;
    let winType: WWinTypeCode | null = null;

    if (pd === 0) {
      tie = true;
    } else {
      tie = false;
      const style = this.config!.style;
      const { techfall, major, decision } = cnsThresholds[style];
      if (pd >= techfall)
        winType = "tf";
      else if (style === "Folkstyle" && pd >= major) // only folkstyle
        winType = "md";
      else // "decision" needs a 1-point difference. if it's not a tie, it's "decision"
        winType = "de";

      winnerSide = l > r ? "l" : "r";
    }

    return { tie, winnerSide, winType };
  }

  private _evalFreestyleGrecoPoints(): { 
    winner: WSide | undefined; 
    winReason: string | undefined;
  } {
    const maxPt = { l: 0, r: 0, };
    const numCautions = { l: 0, r: 0, };
    let lastPointScored: WSide | undefined = undefined;
    let winner: WSide | undefined = undefined;
    let winReason: string | undefined = undefined;
    const getOppSide = (side: WSide): WSide => side === "l" ? "r" : "l";

    for (const period of this._current.periods) {
      for (const actn of period.actions) {
        if (!!actn.wrestle?.pt && actn.wrestle.pt > 0) {
          if (actn.wrestle.pt > maxPt[actn.wrestle.side]) {
            maxPt[actn.wrestle.side] = actn.wrestle.pt
          }
          lastPointScored = actn.wrestle.side;
        } else if (actn.wrestle?.oppPt && typeof actn.wrestle.oppPt === 'number' && actn.wrestle.oppPt > 0) {
          lastPointScored = getOppSide(actn.wrestle.side);
        }

        if (actn.wrestle?.action === "caution") {
          numCautions[actn.wrestle.side]++;
        }
      }
    } // outer for

    if (maxPt.l !== maxPt.r) {
      winner = maxPt.l > maxPt.r ? 'l' : 'r';
      winReason = "Larger point scoring move";
    } else if (numCautions.l !== numCautions.r) {
      winner = numCautions.l > numCautions.r ? 'l' : 'r';
      winReason = "Number of cautions";
    } else if (!!lastPointScored) {
      winner = lastPointScored;
      winReason = "Last point scored";
    }

    return { winner, winReason };
  }
  
  processPeriodComplete(): void {
    const currentPeriod = this.getCurrentPeriod();

    if (!currentPeriod) {
      co.error("processPeriodComplete: currentPeriod not found");
      return;
    }

    if (currentPeriod.definition.decisive) {

      const pdEval = this._evalPointDifference();

      if (!pdEval.tie) {
        this.updateWinby(pdEval.winnerSide!, pdEval.winType);

      } else { // tie

        if (this.config!.style === "Folkstyle") {

          if (currentPeriod.definition.code === "tbu" && this.config!.age === "Highschool") {
            /**
             * ultimate tie breaker ended for high school
             * whoever chose top + point tie > winner
             */
            const previousPeriod = this.getPreviousPeriod();
            if (!previousPeriod?.positionChoice) {
              co.error('processPeriodComplete: previous period or its position choice not found');
            } else {
              const pppcSide = previousPeriod.positionChoice.side;
              const pppcPosition = previousPeriod.positionChoice.position;

              const winnerSide: WSide = 
                (pppcSide === "l" && pppcPosition === "t" ||
                  pppcSide === "r" && pppcPosition === "b")
                ? "l"
                : "r";

              const actn: WAction = {
                id: generateId(),
                wrestle: {
                  side: winnerSide,
                  action: "keptTop",
                  actionTitle: "kept top",
                  clean: true,
                  pt: 1,
                  oppPt: 0,
                  dq: false,
                },
                ts: Date.now(),
                elapsed: this.peekStoreValue(this._current.clocks.mc.elapsed),
              }

              this.processAction(actn); // add point to winner side
            }

          } else {
            this.resetWinby();
          }

        } else { // style: Freestyle / Greco

          const fgEval = this._evalFreestyleGrecoPoints();

            if (!!fgEval.winner) {
              const actn: WAction = {
                id: generateId(),
                wrestle: {
                  side: fgEval.winner,
                  action: fgEval.winReason!,
                  actionTitle: fgEval.winReason!,
                  clean: true,
                  pt: 0,
                  oppPt: 0,
                  dq: false,
                },
                ts: Date.now(),
                elapsed: this.peekStoreValue(this._current.clocks.mc.elapsed),
              }
  
              this.processAction(actn); // add point to winner side

            }

        }
      }


    } else { // not a decisive period

    } 
  }

  goToNextPeriod(): void {
    this._current.periodIdx++;    
    this.resetClock('mc');
    this.setPosition('l', 'n');
  }


  // ++++++++++++++++++++++++ 8. Scoring ++++++++++++++++++++++++

  getPointsForMatch(): { l: number; r: number } {
    const allActions = this.getAllActions().filter(a => a.wrestle);
    
    const leftPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.wrestle?.side === "l" && a.wrestle?.pt) {
        add += a.wrestle.pt;
      }
      if (a.wrestle?.side === "r" && a.wrestle?.oppPt) {
        add += a.wrestle.oppPt;
      }
      return acc + add;
    }, 0);
    
    const rightPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.wrestle?.side === "r" && a.wrestle?.pt) {
        add += a.wrestle.pt;
      }
      if (a.wrestle?.side === "l" && a.wrestle?.oppPt) {
        add += a.wrestle.oppPt;
      }
      return acc + add;
    }, 0);
    
    return { l: leftPoints, r: rightPoints };
  }

  // ++++++++++++++++++++++++ 9. Position and Color ++++++++++++++++++++++++

  setColor(side: WSide, newColor: SideColor) {
    const oppSide: WSide = side === 'r' ? 'l' : 'r';
    const previousColor = this._current[side].color;
    this._current[side].color = newColor;

    // Swap colors if opponent has same color
    if (this._current[oppSide].color === newColor) {
      this._current[oppSide].color = previousColor;
    }
    
    co.info("WrestlingManager: Color changed", { side, newColor });
    this.broadcastCurrentState();
  }

  /**
   * @param {WSide} side 
   * @param {WPos} position 
   * @param {boolean} preselection - pre-period selection ? if so, record so in current period
   */
  setPosition(side: WSide, position: WPos, preselection: boolean = false): void {

    if (preselection) {
      const currentPeriod = this.getCurrentPeriod();
      if (!!currentPeriod) {
        currentPeriod.positionChoice = { side, position };
        co.info("setPosition: preselection", side, position, currentPeriod.realIdx);
      } else {
        co.warn("setPosition: current period not found")
      }
    }

    const oppSide: WSide = side === 'r' ? 'l' : 'r';
    let mirrorPos: WPos = 'n';
    if (position !== 'n') {
      mirrorPos = position === 't' ? 'b' : 't';
    }
    
    this._current[side].pos = position;
    this._current[oppSide].pos = mirrorPos;
    
    this.startRidingClockMaybe();
    
    co.info("WrestlingManager: Position changed", { 
      side, 
      position, 
      leftPos: this._current.l.pos, 
      rightPos: this._current.r.pos 
    });
    this.broadcastCurrentState();
  }

  setDefer(side: WSide): void {
    const currentPeriod = this.getCurrentPeriod();
    if (!currentPeriod) {
      co.warn("setDefer: current period not found");
      return;
    }
    currentPeriod.defer = side;
  }

  determineWhoCanChoosePosition(): { l: boolean; r: boolean } {
    const currentPeriod = this.getCurrentPeriod();
    const canChooseSides = { l: true, r: true, };

    if (!currentPeriod)
      return canChooseSides;

    // defer overrides period definitions!
    if (!!currentPeriod.defer) {
      if (currentPeriod.defer === "l")
        canChooseSides.l = false;
      else
        canChooseSides.r = false;
      return canChooseSides;
    }

    // no defer set
    if (currentPeriod.definition.whoChooses === "both") {
      // 
    } else if (currentPeriod.definition.whoChooses === "notprevious") {
      const prev = this.getPreviousPeriod();
      if (!!prev) {
        if (prev.positionChoice) { 
          if (prev.positionChoice.side === "l") {
            canChooseSides.l = false;
          } else {
            canChooseSides.r = false;
          }
        } else { 
          // no position was chosen!
        }
      } else { 
        // no previous period!
      }
    } else if (currentPeriod.definition.whoChooses === "firstblood") {
      if (this._current.firstblood === "l") {
        canChooseSides.r = false;
      } else if (this._current.firstblood === "r") {
        canChooseSides.l = false;
      } else {
        // no first blood!
      }
    }
    return canChooseSides;
  }

  // ++++++++++++++++++++++++ 10. Riding clock ++++++++++++++++++++++++

  startRidingClockMaybe() {
    if (this._current.clocks.ride) {
      const leftPos = this._current.l.pos;
      const isMainClockRunning = this.peekStoreValue(this._current.clocks.mc.isRunning);
      
      if (isMainClockRunning) {
        if (leftPos === 't') {
          this._current.clocks.ride.switchToSide('l');
          co.debug("WrestlingManager: Riding clock switched to left");
        } else if (leftPos === 'b') {
          this._current.clocks.ride.switchToSide('r');
          co.debug("WrestlingManager: Riding clock switched to right");
        } else {
          this._current.clocks.ride.stop();
          co.debug("WrestlingManager: Riding clock stopped (neutral)");
        }
      } else {
        this._current.clocks.ride.stop();
        co.debug("WrestlingManager: Riding clock stopped (main clock not running)");
      }
    }
  }
  stopRidingClockMaybe() {
    const isMainClockRunning = this.peekStoreValue(this._current.clocks.mc.isRunning);
    if (this._current.clocks.ride && isMainClockRunning) {
      this._current.clocks.ride.stop();
      co.debug("WrestlingManager: Riding clock stopped");
    }
  }

  setRidingTime(netTimeMs: number) {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.setNetTime(netTimeMs);
      co.info("WrestlingManager: Riding time set", { netTimeMs });
      this.broadcastCurrentState();
    }
  }

  resetRidingClock() {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.reset();
      this.startRidingClockMaybe();
      co.info("WrestlingManager: Riding clock reset");
      this.broadcastCurrentState();
    }
  }

  swapRidingAdvantage() {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.swapAdvantage();
      co.info("WrestlingManager: Riding advantage swapped");
      this.broadcastCurrentState();
    }
  }

  // ++++++++++++++++++++++++ 11. Team/athlete ++++++++++++++++++++++++

  updateNames(updateData: WNameUpdate): void {
    this.setAthleteName('l', updateData.leftAthlete.firstName, updateData.leftAthlete.lastName);
    this.setAthleteName('r', updateData.rightAthlete.firstName, updateData.rightAthlete.lastName);
    this.setTeamName('l', updateData.leftTeam.name, updateData.leftTeam.abbreviation);
    this.setTeamName('r', updateData.rightTeam.name, updateData.rightTeam.abbreviation);
  }

  setTeamName(side: WSide, name: string, abbr?: string) {
    this._current[side].team.name = name;
    if (abbr) {
      this._current[side].team.abbreviation = abbr;
    }
    this.broadcastCurrentState();
  }

  setAthleteName(side: WSide, firstName: string, lastName: string) {
    this._current[side].athlete.firstName = firstName;
    this._current[side].athlete.lastName = lastName;
    this.broadcastCurrentState();
  }


  // ++++++++++++++++++++++++ 12. Bout Number ++++++++++++++++++++++++

  setBoutNumber(boutNumber: number | undefined): void {
    this._current.boutNumber = boutNumber;
    this.broadcastCurrentState();
  }

  // ++++++++++++++++++++++++ 90. Utility methods ++++++++++++++++++++++++

  private peekStoreValue(store: any): any {
    let value: any;
    const unsubscribe = store.subscribe((val: any) => value = val);
    unsubscribe();
    return value;
  }

  // ++++++++++++++++++++++++ 99. Cleanup ++++++++++++++++++++++++


  private destroyMainClocks() {
    this._current.clocks.mc?.destroy();
    this._current.clocks.rest?.destroy();
    this._current.clocks.shotclock?.destroy();
    this._current.clocks.ride?.destroy();
  }

  private destroySideClocks() {
    Object.values(this._current.l.clocks).forEach(clock => clock?.destroy());
    Object.values(this._current.r.clocks).forEach(clock => clock?.destroy());
    this._current.l.clocks = {};
    this._current.r.clocks = {};
  }

  resetMatch() {
    co.info("WrestlingManager: Resetting match");
    this.destroyMainClocks();
    this.destroySideClocks();
    this.initialized = false;
    this.initializeMatch(this.config as WConfig);
  }

  static destroy() {
    if (WrestlingManager.instance) {
      WrestlingManager.instance.destroyMainClocks();
      WrestlingManager.instance.destroySideClocks();
      WrestlingManager.instance.cleanupBroadcast();
      WrestlingManager.instance = null;
    }
  }
}

export const wrestlingManager = WrestlingManager.getInstance();