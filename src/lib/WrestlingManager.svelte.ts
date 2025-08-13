// Enhanced WrestlingManager.svelte.ts with action recomputation

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
import { co } from "./console";
import { RidingClock } from "./RidingClock";

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
  private actionTitleMap: Map<string, ActionEntry> = new Map<string, ActionEntry>();;

  private constructor() {
    // Private constructor prevents direct instantiation
  }

  static getInstance(): WrestlingManager {
    if (!WrestlingManager.instance) {
      WrestlingManager.instance = new WrestlingManager();
    }
    return WrestlingManager.instance;
  }

  initializeMatch(config: WConfig) {
    this.config = config;
    this.initialize();
    this.initialized = true;
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

    // 0. ----------------- get constants -----------------
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

    // 1. ----------------- set action map -----------------

    const allActions = cnsActions[this.config.style];
    this.actionTitleMap = new Map<string, ActionEntry>();
    [...allActions].forEach(action => {
      this.actionTitleMap.set(action.code, action);
    });

    // 2. ----------------- clock setup -----------------
    this.destroyMainClocks();
    // main clock
    const firstPeriodMs = (this.config.periodLengths[0]) * 1000;
    this._current.clocks.mc = new ZonkClock(firstPeriodMs);
    // ride and shot
    if (!!timeConstants.rt)
      this._current.clocks.ride = new RidingClock();
    if (!!timeConstants.sc) {
      const scMs = timeConstants.sc * 1000;
      this._current.clocks.shotclock = new ZonkClock(scMs);
    }

    // 3. ----------------- periods setup -----------------
    this._current.periods = []; // Clear existing periods
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

    // 4. ----------------- colors and sides -----------------
    const colorConstants = cnsColors[this.config.style];
    let lColor: SideColor = 'red', rColor: SideColor = 'green';
    if (colorConstants) {
      lColor = colorConstants.left;
      rColor = colorConstants.right;
    }
    this._current.l = getSideState(lColor);
    this._current.r = getSideState(rColor);
    this.initializeSideClocks(timeConstants);
    
    // 5. ----------------- remaining fields -----------------
    this._current.config = this.config;
    this._current.clockInfo = {
      activeId: 'mc',
      lastActivatedId: '',
      lastActivatedAction: '',
    };
    this._current.periodIdx = 0;
    this._current.defer = '';

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

  // ===================== NEW: Action Recomputation Methods =====================

  /**
   * Recalculates counts and dependent properties for all actions
   * This should be called after any structural changes (switch/delete)
   */
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

  /**
   * Recomputes derived properties for a single action based on its count
   */
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

  /**
   * Validates that all action counts are correct (debug)
   */
  private validateActionCounts(): boolean {
    const expectedCounts = new Map<string, number>();
    let isValid = true;
    
    for (const period of this._current.periods) {
      for (const action of period.actions) {
        if (!action.wrestle) continue;
        
        const key = `${action.side}_${action.wrestle.action}`;
        const currentCount = expectedCounts.get(key) || 0;
        const expectedCount = currentCount + 1;
        expectedCounts.set(key, expectedCount);
        
        if (action.wrestle.cnt !== expectedCount) {
          co.error(`Action count mismatch: ${key} expected ${expectedCount}, got ${action.wrestle.cnt}`);
          isValid = false;
        }
      }
    }
    
    return isValid;
  }

  // ===================== Enhanced Action Management =====================

  switchActionSide(actionId: string): boolean {
    const result = this.getActionById(actionId);
    if (!result) return false;

    const { action } = result;
    const newSide: WSide = action.side === "l" ? "r" : "l";
    action.side = newSide;
    
    this.recomputeActionCounts();

    co.debug(`Action ${actionId} switched to side ${newSide}`, this.validateActionCounts());
    return true;
  }

  deleteAction(actionId: string): boolean {
    const result = this.getActionById(actionId);
    if (!result) return false;
    
    const { periodIndex, actionIndex } = result;
    this._current.periods[periodIndex].actions.splice(actionIndex, 1);
    
    this.recomputeActionCounts();

    co.debug(`Action ${actionId} deleted from period ${periodIndex}`, this.validateActionCounts());
    return true; 
  }

  /**
   * Bulk operations that are more efficient for multiple changes
   */
  performBulkActionChanges(changes: Array<{
    type: 'switch' | 'delete';
    actionId: string;
  }>): boolean {
    let hasChanges = false;
    
    // Apply all changes first
    for (const change of changes) {
      const result = this.getActionById(change.actionId);
      if (!result) continue;
      
      if (change.type === 'switch') {
        const { action } = result;
        const newSide: WSide = action.side === "l" ? "r" : "l";
        action.side = newSide;
        hasChanges = true;
      } else if (change.type === 'delete') {
        const { periodIndex, actionIndex } = result;
        this._current.periods[periodIndex].actions.splice(actionIndex, 1);
        hasChanges = true;
      }
    }
    
    // Only recompute once at the end
    if (hasChanges) {
      this.recomputeActionCounts();
      co.debug(`Bulk changes applied: ${changes.length} operations`);
    }
    
    return hasChanges;
  }

  /**
   * ------------------------- CLOCK -------------------------
   */

  startClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      this.stopActiveClock();
      
      if (clockId === 'mc') {
        (clock as ZonkClock).start();
        
        if (this._current.clocks.ride) {
          const leftPos = this._current.l.pos;
          if (leftPos === 't') {
            this.startRidingClock('l');
          } else if (leftPos === 'b') {
            this.startRidingClock('r');
          }
          // else : neutral. do not start
        }
      } else if (clockId === 'ride') {
        // do nothing
        return;
      } else { // Other clocks
        (clock as ZonkClock).start();
      }
      
      this._current.clockInfo.activeId = clockId;
      this._current.clockInfo.lastActivatedId = clockId;
      this._current.clockInfo.lastActivatedAction = 'start';
    }
  }

  stopClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      if (clockId === 'mc') {
        (clock as ZonkClock).stop();
        
        if (this._current.clocks.ride) {
          this.stopRidingClock();
        }
      } else if (clockId === 'ride') {
        // do nothing
      } else { // Other clocks
        (clock as ZonkClock).stop();
      }
      
      if (this._current.clockInfo.activeId === clockId) {
        this._current.clockInfo.activeId = '';
      }
      this._current.clockInfo.lastActivatedAction = 'stop';
    }
  }

  resetClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      clock.reset();
      this._current.clockInfo.lastActivatedAction = 'reset';
    }
  }

  setClockTime(clockId: string, newTimeMs: number) {
    console.log('set clock time', clockId, newTimeMs)
    this.setClockById(clockId, new ZonkClock(newTimeMs));
  }

  private stopActiveClock() {
    if (this._current.clockInfo.activeId) {
      const activeClock = this.getClockById(this._current.clockInfo.activeId);
      activeClock?.stop();
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
    if (clockId === 'mc' && newClock instanceof ZonkClock) {
      this._current.clocks.mc = newClock;
      return true;
    }
    if (clockId === 'rest' && newClock instanceof ZonkClock) {
      this._current.clocks.rest = newClock;
      return true;
    }
    if (clockId === 'shotclock' && newClock instanceof ZonkClock) {
      this._current.clocks.shotclock = newClock;
      return true;
    }
    if (clockId === 'ride' && newClock instanceof RidingClock) {
      this._current.clocks.ride = newClock;
      return true;
    }
    
    // Handle side clocks (format: "left_blood", "right_injury", etc.)
    const [side, clockType] = clockId.split('_');
    if ((side === 'left' || side === 'l') && newClock instanceof ZonkClock) {
      if (clockType in this._current.l.clocks) {
        this._current.l.clocks[clockType as keyof typeof this._current.l.clocks] = newClock;
        return true;
      }
    }
    if (side === 'right' || side === 'r') {
      if ((clockType in this._current.r.clocks) && newClock instanceof ZonkClock) {
        this._current.r.clocks[clockType as keyof typeof this._current.r.clocks] = newClock;
        return true;
      }
    }
    
    return false; // Clock ID not found
  }


  private isMainClockRunning(): boolean {
    let isRunning = false;
    this._current.clocks.mc.isRunning.subscribe(val => isRunning = val)();
    return isRunning;
  }

  /**
   * ------------------------- RIDE TIME -------------------------
   */

  public startRidingClock(side: WSide): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.startForSide(side);
    }
  }

  public stopRidingClock(): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.stop();
    }
  }

  public switchRidingClock(side: WSide): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.switchToSide(side);
    }
  }

  public resetRidingClock(): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.reset();
    }
  }

  public swapRidingAdvantage(): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.swapAdvantage();
    }
  }

  public setRidingTime(netTimeMs: number): void {
    if (this._current.clocks.ride) {
      this._current.clocks.ride.setNetTime(netTimeMs);
    }
  }

  public getRidingAdvantageTime(side: WSide): number {
    if (this._current.clocks.ride) {
      return this._current.clocks.ride.getAdvantageTime(side);
    }
    return 0;
  }


  /**
   * ------------------------- ACTIONS -------------------------
   */

  getAllActions() {
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
      return;
    }

    if (actn.wrestle?.action === "manual") {
      const matchPoints = this.getPointsForMatch();
      if (matchPoints[actn.side] + actn.wrestle.pt < 0) {
        return; // don't allow manual points to drag the points into the negative
      }
    }

    const mainClockElapsed = this._current.clocks.mc.getTotalElapsed();
    actn.elapsed = Math.floor(mainClockElapsed / 1000);

    if (actn.wrestle) { // wrestling action
      const actionCount = this.countActionsBySide(actn.side, actn.wrestle.action);
      actn.wrestle.cnt = actionCount + 1;
      

      // add info from constants - ("manual" doesn't exist in constants)
      const selectedAction = this.actionTitleMap.get(actn.wrestle.action);
      if (!!selectedAction) {

        if (selectedAction.points) {
          actn.wrestle.pt = selectedAction.points[0] as number;
        }
        if (!!selectedAction.oppPoints) {
          actn.wrestle.clean = false;
          if (actn.wrestle.cnt < selectedAction.oppPoints.length) {
            actn.wrestle.oppPt = selectedAction.oppPoints[actn.wrestle.cnt - 1];
          } else {
            actn.wrestle.oppPt = selectedAction.oppPoints[selectedAction.oppPoints.length - 1];
          }
          if (actn.wrestle.oppPt === "dq") {
            actn.wrestle.dq = true;
          }
        }

        if (selectedAction.resultingPos) 
          actn.wrestle.newPos = selectedAction.resultingPos;

        actn.wrestle.actionTitle = selectedAction.title;
      }

      // co.info("process action", actn);
      
      this._current.periods[this._current.periodIdx].actions.push(actn);
      
      if (!!actn.wrestle.newPos) {
        this.setPosition(actn.side, actn.wrestle.newPos);
      }
    } else { // clock action

    }
  }

  // Scores / Points

  getPointsForMatch(): { l: number; r: number } {
    const allActions = this.getAllActions().filter(a => { return !!a.wrestle });
    const leftPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.side === "l" && a.wrestle?.pt)
        add += a.wrestle.pt;
      if (a.side === "r" && a.wrestle?.oppPt && a.wrestle.oppPt !== "dq")
        add += a.wrestle.oppPt;
      return acc + add;
    }, 0);
    const rightPoints = allActions.reduce((acc, a) => {
      let add = 0;
      if (a.side === "r" && a.wrestle?.pt)
        add += a.wrestle.pt;
      if (a.side === "l" && a.wrestle?.oppPt && a.wrestle.oppPt !== "dq")
        add += a.wrestle.oppPt;
      return acc + add;
    }, 0);
    return { l: leftPoints, r: rightPoints };
  }


  // Colors
  setColor(side: WSide, newColor: SideColor) {
    const oppSide: WSide = side === 'r' ? 'l' : 'r';
    const previousColor = this._current[side].color;
    this._current[side].color = newColor;

    if (this._current[oppSide].color === newColor) {
      this._current[oppSide].color = previousColor;
    }
  }

  /**
   * ------------------------ POSITION ------------------------
   */

  setPosition(side: WSide, position: WPos) {
    const oppSide: WSide = side === 'r' ? 'l' : 'r';
    let mirrorPos: WPos = 'n';
    if (position !== 'n')
      mirrorPos = position === 't' ? 'b' : 't';
      
    this._current[side].pos = position;
    this._current[oppSide].pos = mirrorPos;
    
    if (this._current.clocks.ride) {
      const mainClockIsRunning = this.isMainClockRunning();
      
      if (mainClockIsRunning) {
        if (position === 'n') {
          this.stopRidingClock();
        } else {
          const topSide = position === 't' ? side : oppSide;
          const currentSide = this._current.clocks.ride.getAdvantage();
          
          if (currentSide === null) { // ride time at zero
            this.startRidingClock(topSide);
          } else if (currentSide !== topSide) {
            this.switchRidingClock(topSide);
          }
          // else : same side is still on top
        }
      }
    }
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
  }

  setAthleteName(side: WSide, name: string) {
    this._current[side].athleteName = name;
  }

  // Utility methods
  getCurrentPeriod(): number {
    // Logic to determine current period based on clock states
    return 1; // Placeholder
  }

  isMatchComplete(): boolean {
    // Logic to determine if match is over
    return false; // Placeholder
  }

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
    this.destroyMainClocks();
    this.destroySideClocks();
    this.initialized = false;
    this.initializeMatch(this.config as WConfig);
  }

  static destroy() {
    if (WrestlingManager.instance) {
      WrestlingManager.instance.destroyMainClocks();
      WrestlingManager.instance.destroySideClocks();
      WrestlingManager.instance = null;
    }
  }
}

export const wrestlingManager = WrestlingManager.getInstance();