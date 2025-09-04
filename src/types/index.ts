import type { ActionPoint } from "@/constants/wrestling.constants";
import type { ZonkClock, ZonkClockState } from "@/lib/ZonkClock";
import type { RidingClock, RidingClockState } from "@/lib/RidingClock";

/**
 * ++++++++++++++++++++++++++++++++++++++++++++++++ SIMPLE TYPES ++++++++++++++++++++++++++++++++++++++++++++++++
 */

/**
 * ----------------------- General -----------------------
 */
export type WeightUnit =  'lbs' | 'kg';
export type SideColor =   'red' | 'green' | 'blue';

/**
 * ----------------------- Clocks -----------------------
 */
export type ClockEvent =  'start' | 'stop' | 'reset' | 'complete' | 'onesecond' | 'unknown';
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
export type ChoosePositionParty = 'both' | 'none' | 'notprevious' | 'firstblood';



/**
 * ++++++++++++++++++++++++++++++++++++++++++++++++ STANDARD TYPES ++++++++++++++++++++++++++++++++++++++++++++++++
 */

export type WClockPhases = {
  mc: ClockEvent;
  rest?: ClockEvent;
  shotclock?: ClockEvent;
  l: {
    blood?: ClockEvent;
    injury?: ClockEvent;
    recovery?: ClockEvent;
    headneck?: ClockEvent;
  };
  r: {
    blood?: ClockEvent;
    injury?: ClockEvent;
    recovery?: ClockEvent;
    headneck?: ClockEvent;
  };
};

export type WNameUpdate = {
  leftAthlete: WAthlete;
  rightAthlete: WAthlete;
  leftTeam: WTeam;
  rightTeam: WTeam;
}


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
  /** timestamp in ms using Date.now() */
  ts: number;
  /** elapsed time in ms */
  elapsed?: number;
}

export type WPeriodDefinition = {
  code: string;
  name: string;
  decisive: boolean;
  /** // who chooses position for next period */
  whoChooses: ChoosePositionParty; 
  overtime?: boolean;
  restAfter?: boolean;
}

export type WPeriod = {
  seconds: number;
  /** used for display purposes */
  displayIdx: number;
  /** true index */
  realIdx: number;
  definition: WPeriodDefinition;
  positionChoice?: {
    side: WSide;
    position: WPos;
  };
  /** the defer benefactor (not the recipient) */
  defer?: WSide;
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

export type WTeam = {
  name: string;
  abbreviation: string;
}
export type WAthlete = {
  firstName: string;
  lastName: string;
}

export type WStateSide = {
  color: SideColor;
  pos: WPos;
  team: WTeam;
  athlete: WAthlete;
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
  firstblood?: WSide;
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

