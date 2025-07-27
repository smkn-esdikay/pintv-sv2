import type { 
  WStateMain, 
  WConfig, 
  WStateSide, 
  WPos, 
  WSide, 
  ClockEvent, 
  WHistory,
  SideColor
} from "@/types";
import { getCnsClock, getCnsPeriods, type TimersEntry } from "@/constants/wrestling.constants";
import { ZonkClock } from "./ZonkClock";
import { co } from "./console";

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
  defer: '',
  l: getSideState('red'),
  r: getSideState('green'),
  periods: [],
};

export class WrestlingManager {

  private _current = $state<WStateMain>({...placeholderState});
  private _history = $state<WHistory>({ matches: [], });
  private config: WConfig;

  constructor(config: WConfig) {
    this.config = config;
    this.initialize();
  }

  get current(): WStateMain {
    return this._current;
  }

  get history(): WHistory {
    return this._history;
  }

  initialize() { 

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
    
    // 2. ----------------- clock setup -----------------
    this.destroyMainClocks();
    // main clock
    const firstPeriodMs = (this.config.periodLengths[0]) * 1000;
    this._current.clocks.mc.destroy();
    this._current.clocks.mc = new ZonkClock(firstPeriodMs);
    // ride and shot
    if (!!timeConstants.rt)
      this._current.clocks.ride = new ZonkClock(0);
    if (!!timeConstants.sc) {
      const scMs = timeConstants.sc * 1000;
      this._current.clocks.shotclock = new ZonkClock(scMs);
    }
    this.initializeSideClocks(timeConstants);

    // 3. ----------------- clock setup -----------------
    periodConstants.forEach((p, idx) => {

      const cnfLen = this.config.periodLengths[idx] ?? null;
      const cnsLen = timeConstants[p.code as keyof TimersEntry] as number ?? null;
      
      this._current.periods.push({
        title: p.name,
        seconds: cnfLen || cnsLen || 120,
        displayIdx: idx,
        realIdx: idx,
        actions: [],
      })
    });

    // 4. ----------------- remaining fields -----------------
    this._current.config = this.config;
    this._current.clockInfo = {
      activeId: 'mc',
      lastActivatedId: '',
      lastActivatedAction: '',
    };
    this._current.defer = '';
    this._current.l = getSideState('red');
    this._current.r = getSideState('green');
  }

  private initializeSideClocks(timeConstants: TimersEntry) {

    this.destroySideClocks();

    if (!!timeConstants.bl) {
      this._current.l.clocks.blood = new ZonkClock(timeConstants.bl);
      this._current.r.clocks.blood = new ZonkClock(timeConstants.bl);
    }
    if (!!timeConstants.hn) {
      this._current.l.clocks.headneck = new ZonkClock(timeConstants.hn);
      this._current.r.clocks.headneck = new ZonkClock(timeConstants.hn);
    }
    if (!!timeConstants.in) {
      this._current.l.clocks.injury = new ZonkClock(timeConstants.in);
      this._current.r.clocks.injury = new ZonkClock(timeConstants.in);
    }
    if (!!timeConstants.rc) {
      this._current.l.clocks.recovery = new ZonkClock(timeConstants.rc);
      this._current.r.clocks.recovery = new ZonkClock(timeConstants.rc);
    }
  }

  startClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      this.stopActiveClock();
      
      clock.start();
      this._current.clockInfo.activeId = clockId;
      this._current.clockInfo.lastActivatedId = clockId;
      this._current.clockInfo.lastActivatedAction = 'start';
    }
  }

  stopClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      clock.stop();
      if (this._current.clockInfo.activeId === clockId) { // this is probably wrong
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

  private stopActiveClock() {
    if (this._current.clockInfo.activeId) {
      const activeClock = this.getClockById(this._current.clockInfo.activeId);
      activeClock?.stop();
    }
  }

  private getClockById(clockId: string): ZonkClock | undefined {

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

  // Position management
  setPosition(side: WSide, position: WPos) {
    this._current[side].pos = position;
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
    // This would be implemented based on your wrestling rules
    return 1; // Placeholder
  }

  isMatchComplete(): boolean {
    // Logic to determine if match is over
    // Check for pins, tech falls, etc.
    return false; // Placeholder
  }

  destroyMainClocks() {
    this._current.clocks.mc?.destroy();
    this._current.clocks.rest?.destroy();
    this._current.clocks.shotclock?.destroy();
    this._current.clocks.ride?.destroy();
  }

  destroySideClocks() {
    Object.values(this._current.l.clocks).forEach(clock => clock?.destroy());
    Object.values(this._current.r.clocks).forEach(clock => clock?.destroy());
  }

  destroy() {
    this.destroyMainClocks();
    this.destroySideClocks();
  }
}