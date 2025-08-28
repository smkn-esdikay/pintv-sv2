import type { ActionPoint } from "@/constants/wrestling.constants";
import type { ZonkClock, ZonkClockState } from "@/lib/ZonkClock";
import type { RidingClock, RidingClockState } from "@/lib/RidingClock";

/**
 * ----------------------- General -----------------------
 */
export type WeightUnit =  'lbs' | 'kg';
export type SideColor =   'red' | 'green' | 'blue';

/**
 * ----------------------- Clocks -----------------------
 */
export type ClockEvent =  'start' | 'stop' | 'reset' | 'complete' | 'onesecond';
export type ClockId = 'mc' | 'rest' | 'shotclock' | 'ride' |
  'l_blood' | 'l_injury' | 'l_recovery' | 'l_headneck' |
  'r_blood' | 'r_injury' | 'r_recovery' | 'r_headneck' 

/**
 * ----------------------- Wrestling -----------------------
 */
export type WStyle =      'Folkstyle' | 'Freestyle' | 'Greco';
export type WAge =        'Highschool' | 'College' | undefined;
export type WSide =       'l' | 'r';
export type WPos =        't' | 'n' | 'b';

export type WMatchWeight = {
  weight: number;
  unit: WeightUnit;
}

export type WConfig = {
  style: WStyle;
  age: WAge;
  periodLengths: number[]; // seconds
  team: boolean;
}

export type WPosChoice = {
  periodIdx: number;
  side: WSide;
  choice: WPos | 'defer';
}

export type ClockAction = {
  clockId: ClockId;
  event: ClockEvent;
  timeLeft: number; // ms
}

export type WrestlingAction = {
  side: WSide,
  action: string;       // code
  actionTitle: string;  // title

  clean: boolean;
  
  pt: number;
  oppPt: ActionPoint;

  newPos?: WPos;

  dq: boolean;
  cnt?: number;       // count - might replace this with dynamic count
}

export type WAction = {
  id: string;
  clock?: ClockAction;
  wrestle?: WrestlingAction;
  ts: number;         // Date.now()
  elapsed?: number;   // seconds into current period
}

export type ChoosePositionParty = 'both' | 'none' | 'notprevious' | 'firstblood';
export type WPeriodDefinition = {
  code: string;
  name: string;
  decisive: boolean;
  chooseAfter: ChoosePositionParty;
  overtime?: boolean;
  restAfter?: boolean;
}

export type WPeriod = {
  seconds: number;
  displayIdx: number;   // used for display purposes
  realIdx: number;      // true index
  definition: WPeriodDefinition;
  actions: WAction[];
}

export type WMatch = {
  weight?: number;
  ptLeft: number;
  ptRight: number;
  teamPtLeft: number;
  teamPtRight: number;
  winner?: WSide;
  winbyIdx?: number; 
  totalElapsedSeconds?: number;
  winPeriod?: number;
}

export type WHistory = {
  matches: WMatch[];
}


export type WStateSide = {
  color: SideColor;
  showChoosePos: boolean;
  pos: WPos;
  teamName: string;
  teamNameAbbr?: string;
  athleteName?: string;
  winbyIdx: number;
  clocks: {
    blood?: ZonkClock;
    injury?: ZonkClock;
    recovery?: ZonkClock;
    headneck?: ZonkClock;
  };
}

export type WStateSidePublicDisplay = Omit<WStateSide, 'clocks'> & {
  clockStates: {
    blood?: ZonkClockState;
    injury?: ZonkClockState;
    recovery?: ZonkClockState;
    headneck?: ZonkClockState;
  };
}

export type WStateMain = {
  config: WConfig;
  clockInfo: {
    activeId: string;
    lastActivatedId: string;
    lastActivatedAction: string;
  },
  clocks: {
    mc: ZonkClock;
    rest?: ZonkClock;
    shotclock?: ZonkClock;
    ride?: RidingClock;
  };
  l: WStateSide;
  r: WStateSide;
  periods: WPeriod[];
  periodIdx: number;
  defer: string;
  weight?: WMatchWeight;
}

export type WStateMainPublicDisplay = Omit<WStateMain, 'clocks' | 'l' | 'r' | 'periods'> & {
  clockStates: {
    mc: ZonkClockState;
    rest?: ZonkClockState;
    shotclock?: ZonkClockState;
    ride?: RidingClockState;
  },
  l: WStateSidePublicDisplay;
  r: WStateSidePublicDisplay;
  matchPoints: { // added when broadcasting
    l: number,
    r: number,
  }
}

