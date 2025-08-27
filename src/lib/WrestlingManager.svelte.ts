import type { 
  WStateMain, 
  WConfig, 
  WStateSide, 
  WPos, 
  WSide, 
  ClockEvent, 
  WHistory,
  SideColor,
  WAction
} from "@/types";
import { 
  cnsActions,
  cnsColors, 
  getCnsClock, 
  getCnsPeriods, 
  type ActionEntry, 
  type TimersEntry 
} from "@/constants/wrestling.constants";
import { ZonkClock } from "./ZonkClock";
import { RidingClock } from "./RidingClock";
import { co } from "./console";
import { broadcast, } from "./broadcast.svelte";

const getSideState = (color: SideColor): WStateSide => {
  return {
    color: color,
    showChoosePos: false,
    pos: 'n',
    teamName: color,
    athleteName: '',
    winbyIdx: 0,
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
  defer: '',
};

export class WrestlingManager {
  private static instance: WrestlingManager | null = null;
  
  private _current = $state<WStateMain>({...placeholderState});
  private _history = $state<WHistory>({ matches: [], });
  private config: WConfig | null = null;
  private initialized = false;
  private actionTitleMap: Map<string, ActionEntry> = new Map<string, ActionEntry>();
  private broadcastUnsubscribes: (() => void)[] = [];

  private constructor() {
    // Private constructor prevents direct instantiation
  }

  static getInstance(): WrestlingManager {
    if (!WrestlingManager.instance) {
      WrestlingManager.instance = new WrestlingManager();
    }
    return WrestlingManager.instance;
  }

  // Broadcast methods

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
    
    // const points = this.getPointsForMatch();
    
    broadcast.sendState('state', this._current);
  }

  private cleanupBroadcast() {
    this.broadcastUnsubscribes.forEach(unsub => unsub());
    this.broadcastUnsubscribes = [];
  }

  // Public API

  initializeMatch(config: WConfig) {
    this.config = config;
    this.initialize();
    this.initialized = true;
    
    // Broadcast initial state
    this.broadcastCurrentState();
    this.setupBroadcastHandlers();
  }

  get current(): WStateMain {
    if (!this.initialized) {
      co.warn("WrestlingManager: Accessing state before initialization");
    }
    return this._current;
  }

  get history(): WHistory {
    return this._history;
  }

  get isInitialized(): boolean {
    return this.initialized;
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
    if (!!timeConstants.rt) {
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
        title: p.name,
        seconds: cnfLen || cnsLen || 120,
        displayIdx: idx,
        realIdx: idx,
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
    
    // 5. Remaining fields
    this._current.config = this.config;
    this._current.clockInfo = {
      activeId: 'mc',
      lastActivatedId: '',
      lastActivatedAction: '',
    };
    this._current.periodIdx = 0;
    this._current.defer = '';

    co.success("WrestlingManager: Match initialized", {
      style: this.config.style,
      age: this.config.age,
      periods: this._current.periods.length,
      hasRidingClock: !!this._current.clocks.ride
    });
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

  // Clock management

  startClock(clockId: string) {
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

  stopClock(clockId: string) {
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

  resetClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      clock.reset();
      this._current.clockInfo.lastActivatedAction = 'reset';
      
      // Broadcast clock reset
      const timeLeft = clock instanceof RidingClock ? 0 : clock.getRemainingTime();
      // broadcastClockReset(clockId, timeLeft);
      this.broadcastCurrentState();
    }
  }

  setClockTime(clockId: string, newTimeMs: number) {
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

  private stopActiveClock() {
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

  // Action management

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
        action.side === side && 
        action.wrestle?.action === actionCode
      ).length;
  }

  processAction(actn: WAction) {
    if (!this._current.periods[this._current.periodIdx]) {
      co.warn("WrestlingManager: No current period to add action to");
      return;
    }

    // Prevent negative scores for manual actions
    if (actn.wrestle?.action === "manual") {
      const matchPoints = this.getPointsForMatch();
      if (matchPoints[actn.side] + actn.wrestle.pt < 0) {
        co.warn("WrestlingManager: Cannot make score negative with manual action");
        return;
      }
    }

    // Add elapsed time
    const mainClockElapsed = this._current.clocks.mc.getTotalElapsed();
    actn.elapsed = Math.floor(mainClockElapsed / 1000);

    if (actn.wrestle) {
      const actionCount = this.countActionsBySide(actn.side, actn.wrestle.action);
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
          if (actn.wrestle.cnt <= selectedAction.oppPoints.length) {
            actn.wrestle.oppPt = selectedAction.oppPoints[actn.wrestle.cnt - 1];
          } else {
            actn.wrestle.oppPt = selectedAction.oppPoints[selectedAction.oppPoints.length - 1];
          }
          if (actn.wrestle.oppPt === "dq") {
            actn.wrestle.dq = true;
          }
        }

        // Set resulting position
        if (selectedAction.resultingPos) {
          actn.wrestle.newPos = selectedAction.resultingPos;
        }

        actn.wrestle.actionTitle = selectedAction.title;
      }

      co.info("WrestlingManager: Processing action", {
        side: actn.side,
        action: actn.wrestle.action,
        points: actn.wrestle.pt,
        oppPoints: actn.wrestle.oppPt,
        newPos: actn.wrestle.newPos
      });
      
      // Add action to current period
      this._current.periods[this._current.periodIdx].actions.push(actn);
      
      // Update position if action results in position change
      if (actn.wrestle.newPos) {
        this.setPosition(actn.side, actn.wrestle.newPos);
      }
      
      // Broadcast state update
      this.broadcastCurrentState();
    }
  }


  
  private recomputeActionCounts(): void {
    // First pass: Count actions by side and type
    const actionCounts = new Map<string, number>(); // key: `${side}_${actionCode}`
    
    // Process all actions in chronological order to rebuild counts
    for (const period of this._current.periods) {
      for (const action of period.actions) {
        if (!action.wrestle) continue;
        
        const key = `${action.side}_${action.wrestle.action}`;
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

  
  // recomputes derived properties for a single action based on its count
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
      
      // Get the appropriate opponent points for this occurrence count
      let oppPtValue;
      if (count <= selectedAction.oppPoints.length) {
        oppPtValue = selectedAction.oppPoints[count - 1];
      } else {
        // Use the last value for counts beyond the array length
        oppPtValue = selectedAction.oppPoints[selectedAction.oppPoints.length - 1];
      }
      
      action.wrestle.oppPt = oppPtValue;
      
      if (oppPtValue === "dq") {
        action.wrestle.dq = true;
      }
    }
  }


  switchActionSide(actionId: string): boolean {
    const result = this.getActionById(actionId);
    if (!result) return false;

    const { action } = result;
    const newSide: WSide = action.side === "l" ? "r" : "l";
    action.side = newSide;

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

  // Scoring

  getPointsForMatch(): { l: number; r: number } {
    const allActions = this.getAllActions().filter(a => a.wrestle);
    
    const leftPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.side === "l" && a.wrestle?.pt) {
        add += a.wrestle.pt;
      }
      if (a.side === "r" && a.wrestle?.oppPt && a.wrestle.oppPt !== "dq") {
        add += a.wrestle.oppPt as number;
      }
      return acc + add;
    }, 0);
    
    const rightPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.side === "r" && a.wrestle?.pt) {
        add += a.wrestle.pt;
      }
      if (a.side === "l" && a.wrestle?.oppPt && a.wrestle.oppPt !== "dq") {
        add += a.wrestle.oppPt as number;
      }
      return acc + add;
    }, 0);
    
    return { l: leftPoints, r: rightPoints };
  }

  // Position and color management

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

  setPosition(side: WSide, position: WPos) {
    const oppSide: WSide = side === 'r' ? 'l' : 'r';
    let mirrorPos: WPos = 'n';
    if (position !== 'n') {
      mirrorPos = position === 't' ? 'b' : 't';
    }
    
    this._current[side].pos = position;
    this._current[oppSide].pos = mirrorPos;
    
    // Update riding clock if it exists and main clock is running
    if (this._current.clocks.ride) {
      const leftPos = this._current.l.pos;
      const isMainClockRunning = this.getStoreValue(this._current.clocks.mc.isRunning);
      
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
      }
    }
    
    co.info("WrestlingManager: Position changed", { 
      side, 
      position, 
      leftPos: this._current.l.pos, 
      rightPos: this._current.r.pos 
    });
    this.broadcastCurrentState();
  }

  showPositionChoice(side: WSide, show: boolean = true) {
    this._current[side].showChoosePos = show;
  }

  // Team/athlete management

  setTeamName(side: WSide, name: string, abbr?: string) {
    this._current[side].teamName = name;
    if (abbr) {
      this._current[side].teamNameAbbr = abbr;
    }
    this.broadcastCurrentState();
  }

  setAthleteName(side: WSide, name: string) {
    this._current[side].athleteName = name;
    this.broadcastCurrentState();
  }

  // Riding clock specific methods

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

  // Utility methods

  getCurrentPeriod(): number {
    return this._current.periodIdx + 1;
  }

  isMatchComplete(): boolean {
    // Basic logic - can be expanded
    const points = this.getPointsForMatch();
    return points.l >= 15 || points.r >= 15; // Tech fall example
  }

  private getStoreValue(store: any): any {
    let value: any;
    const unsubscribe = store.subscribe((val: any) => value = val);
    unsubscribe();
    return value;
  }

  // Cleanup methods

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