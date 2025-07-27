import type { 
  WStateMain, 
  WConfig, 
  WStateSide, 
  WPos, 
  WSide, 
  ClockEvent, 
  WHistory
} from "@/types";
import { ZonkClock } from "./ZonkClock";


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
  l: {
    color: "red",
    showChoosePos: false,
    pos: 'n',
    teamName: 'Red',
    athleteName: '',
    winbyIdx: 0,
    clocks: {}
  },
  r: {
    color: "green",
    showChoosePos: false,
    pos: 'n', 
    teamName: 'Green',
    athleteName: '',
    winbyIdx: 0,
    clocks: {}
  }
}

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

  initialize() { // build the state using the config

    this._current.config = this.config;
    
    const firstPeriodMs = (this.config.periodLengths[0]) * 1000;
    this._current.clocks.mc.destroy();
    this._current.clocks.mc = new ZonkClock(firstPeriodMs);
    
    this.initializeSideClocks();
  }

  // Initialize injury/blood/etc clocks for both sides
  private initializeSideClocks() {
    const style = this._current.config.style;
    
    // Blood time (5 minutes = 300 seconds)
    this._current.l.clocks.blood = new ZonkClock(300000);
    this._current.r.clocks.blood = new ZonkClock(300000);
    
    // Injury time varies by style
    const injuryTime = style === 'Folkstyle' ? 90000 : 120000; // 1.5min vs 2min
    this._current.l.clocks.injury = new ZonkClock(injuryTime);
    this._current.r.clocks.injury = new ZonkClock(injuryTime);
    
    if (style === 'Folkstyle') {
      // Recovery time (2 minutes)
      this._current.l.clocks.recovery = new ZonkClock(120000);
      this._current.r.clocks.recovery = new ZonkClock(120000);
      
      // Head/neck injury (5 minutes)
      this._current.l.clocks.headneck = new ZonkClock(300000);
      this._current.r.clocks.headneck = new ZonkClock(300000);
    }
  }


  startClock(clockId: string) {
    const clock = this.getClockById(clockId);
    if (clock) {
      // Stop currently active clock
      this.stopActiveClock();
      
      // Start new clock
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

  // Cleanup method
  destroy() {
    // Clean up all clocks
    this._current.clocks.mc?.destroy();
    this._current.clocks.rest?.destroy();
    this._current.clocks.shotclock?.destroy();
    this._current.clocks.ride?.destroy();
    
    // Clean up side clocks
    Object.values(this._current.l.clocks).forEach(clock => clock?.destroy());
    Object.values(this._current.r.clocks).forEach(clock => clock?.destroy());
  }
}