import type { ZonkClock } from "@/lib/ZonkClock";

/**
 * ----------------------- General -----------------------
 */
export type WeightUnit = 'lbs' | 'kg';
export type SideColor = 'red' | 'green' | 'blue';


/**
 * ----------------------- Clocks -----------------------
 */
export type ClockEvent = 'start' | 'stop' | 'reset' | 'complete';


/**
 * ----------------------- Wrestling -----------------------
 */

export type WStyle = 'Folkstyle' | 'Freestyle' | 'Greco';
export type WAge = 'Highschool' | 'College' | undefined;
export type WSide = 'l' | 'r';
export type WPos = 't' | 'n' | 'b';

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
  clockId: string;
  event: ClockEvent;
  timeLeft: number; // ms
}

export type WrestlingAction = {
  action: string;       // code
  actionTitle: string;  // title

  clean: boolean;
  
  pt: number;
  oppPt: number;

  newPos?: WPos;

  dq: boolean;
  cnt?: number; // count - might replace this with dynamic count
}

export type WAction = {
  id: string;
  clock?: ClockAction;
  wrestle?: WrestlingAction;
  side: WSide;
  ts: number; // Date.now()
  elapsed?: number; // seconds into current period
}

export type WPeriod = {
  title: string;
  seconds: number;
  displayIdx: number; // used for display purposes
  realIdx: number; // true index
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
  }
}

export type WHistory = {
  matches: WMatch[];
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
    ride?: ZonkClock;
  };
  l: WStateSide;
  r: WStateSide;
  periods: WPeriod[];
  periodIdx: number;
  defer: string;
}

