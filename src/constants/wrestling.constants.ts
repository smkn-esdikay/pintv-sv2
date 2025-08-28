import type { SideColor, WAge, WConfig, WeightUnit, WPeriodDefinition, WPos, WStyle } from "@/types";


export const cnsStyles: { 
  style: WStyle; 
  ages: WAge[] | undefined; 
}[] = [
  {
    style: "Folkstyle",
    ages: ["Highschool", "College"],
  },
  {
    style: "Freestyle",
    ages: undefined,
  },
  {
    style: "Greco",
    ages: undefined,
  },
];

/**
 * All time values are in seconds unless otherwise noted.
 * 
 *  p1-p3: Periods 1-3 
 * 
 *  bl: Blood time 
 *  in: Injury time   
 *  hn: Head/neck injury time 
 *  rc: Recovery time
 * 
 *  sv: sudden vic
 *  tb1, tb2: tie breakers I, II
 *  utb: ultimate tie breaker
 * 
 *  sc: Shot clock duration
 *  rt: Riding time enabled (boolean - college only)
 *  twP: Time between periods
 *  twM: Time between matches
 */
export interface TimersEntry {
  p1: number;
  p2: number; 
  p3?: number;
  
  bl?: number;
  in?: number;
  hn?: number;
  rc?: number;
  
  sv?: number;
  tb1?: number;
  tb2?: number;
  tbu?: number;
  
  sc?: number;
  
  rt?: boolean;
  
  twP?: number;
  twM?: number;
}

interface ClocksEntry {
  style: WStyle;
  age?: WAge;
  timers: TimersEntry;
}
export const cnsClocks: ClocksEntry[] = [
  {
    style: 'Folkstyle',
    age: 'Highschool',
    timers: {
      p1: 120, p2: 120, p3: 120,
      sv: 120, tb1: 30, tb2: 30, tbu: 30,
      bl: 300, hn: 300, in: 90, rc: 120,
      rt: false,
    },
  },
  {
    style: 'Folkstyle',
    age: 'College',
    timers: {
      p1: 180, p2: 120, p3: 120,
      sv: 120, tb1: 30, tb2: 30, tbu: 30,
      bl: 300, hn: 300, in: 90, rc: 120,
      rt: true,
    },
  },
  {
    style: 'Freestyle',
    age: undefined,
    timers: {
      p1: 180, p2: 180, 
      bl: 300, in: 120,
      rt: false, sc: 30,
    },
  },
  {
    style: 'Greco',
    age: undefined,
    timers: {
      p1: 180, p2: 180, 
      bl: 300, in: 120,
      rt: false,
    },
  },
];
export const getCnsClock = (config: WConfig): TimersEntry | null => {
  const cIdx = cnsClocks.findIndex(el => {
    let ageOK = true;
    if (config.style === "Folkstyle") {
      ageOK = config.age === el.age;
    }
    return config.style === el.style && ageOK;
  });
  return cIdx > -1 ? cnsClocks[cIdx].timers : null;
}

interface WeightListEntry {
  age?: WAge;
  title: string;
  unit: WeightUnit;
  weights: number[];
}
export const cnsWeights = {
  Folkstyle: [
    {
      age: 'Highschool',
      title: '',
      unit: 'lbs',
      weights: [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285],
    },
    {
      age: 'Highschool',
      title: '',
      unit: 'lbs',
      weights: [107, 114, 121, 127, 133, 139, 145, 152, 160, 172, 189, 215, 285],
    },
    {
      age: 'College',
      title: '',
      unit: 'lbs',
      weights: [125, 133, 141, 149, 157, 165, 174, 184, 197, 285],
    },
  ] as WeightListEntry[],
  Freestyle: [
    {
      age: undefined,
      title: 'WNCAA',
      unit: 'lbs',
      weights: [101, 109, 116, 123, 130, 136, 143, 155, 170, 191],
    },
    {
      age: undefined,
      title: `Olympic Men's`,
      unit: 'kg',
      weights: [57, 65, 74, 86, 97, 125],
    },
    {
      age: undefined,
      title: `Olympic Women's`,
      unit: 'kg',
      weights: [50, 53, 57, 62, 68, 76],
    },
  ] as WeightListEntry[],
  Greco: [
    {
      age: undefined,
      title: ``,
      unit: 'kg',
      weights: [60, 67, 77, 87, 97, 130],
    },
  ] as WeightListEntry[],
};

interface WinbyEntry {
  display: string;
  value: number;
  teamPoints: number;
  selectable: boolean;
}
export const cnsWinby: WinbyEntry[] = [
  { display: 'Win By', value: 0, teamPoints: 0, selectable: true, },
  { display: 'Decision', value: 1, teamPoints: 3, selectable: true, },
  { display: 'Major Dec.', value: 1, teamPoints: 4, selectable: true, },
  { display: 'Tech Fall', value: 1, teamPoints :5, selectable: true, },
  { display: 'Pin Fall', value: 1, teamPoints: 6, selectable: true, },
  { display: 'Injury', value: 1, teamPoints :6, selectable: true, },
  { display: 'Forfeit', value: 1, teamPoints :6, selectable: true, },
  { display: 'DQ', value: 1, teamPoints: 6, selectable: true, },
];


export const cnsPeriods = {
  Folkstyle: [
    { code: 'p1', name: 'Period 1', decisive: false, chooseAfter: 'both', },
    { code: 'p2', name: 'Period 2', decisive: false, chooseAfter: 'notprevious', },
    { code: 'p3', name: 'Period 3', decisive: true, chooseAfter: 'none', },

    { code: 'sv', name: 'Sudden Victory', decisive: true, chooseAfter: 'both', overtime: true, }, // folkstyle college periods 4-6 can repeat 
    { code: 'tb1', name: 'Tie Breaker I', decisive: false, chooseAfter: 'notprevious', overtime: true, },
    { code: 'tb2', name: 'Tie Breaker II', decisive: true, chooseAfter: 'firstblood', overtime: true, },
    
    { code: 'tbu', name: 'Ultimate Tie Breaker', decisive: true, chooseAfter: 'none', }, // only for high school
  ] as WPeriodDefinition[],

  Freestyle: [
    { name: 'Period 1', decisive: false, chooseAfter: 'none', restAfter: true, },
    { name: 'Period 2', decisive: true, chooseAfter: 'none', },
  ] as WPeriodDefinition[],
  Greco: [
    { name: 'Period 1', decisive: false, chooseAfter: 'none', restAfter: true, },
    { name: 'Period 2', decisive: true, chooseAfter: 'none', },
  ] as WPeriodDefinition[],
};
export const getCnsPeriods = (config: WConfig): WPeriodDefinition[] | null => {
  return cnsPeriods[config.style] ?? null;
};

interface ThresholdEntry {
  techfall: number;
  major: number;
  decision: number;
}
export const cnsThresholds = {
  Folkstyle: { techfall: 15, major: 8, decision: 1 } as ThresholdEntry,
  Freestyle: { techfall: 10, major: 8, decision: 1 } as ThresholdEntry,
  Greco: { techfall: 10, major: 8, decision: 1 } as ThresholdEntry,
};

interface ColorEntry {
  left: SideColor;
  right: SideColor;
}
export const cnsColors = {
  Folkstyle: { left: "red", right: "green" } as ColorEntry,
  Freestyle: { left: "red", right: "blue" } as ColorEntry,
  Greco: { left: "red", right: "blue" } as ColorEntry,
}

export type ActionPoint = number | 'dq';
export type ActionEntry = {
  code: string;
  title: string;
  show?: WPos;
  points?: ActionPoint[];
  oppPoints?: ActionPoint[];
  resultingPos?: WPos;
}

export const cnsActions = {
  Folkstyle: [
    { code: 'td',  title: 'Takedown', show: 'n', points: [3], resultingPos: 't', },
    { code: 'esc', title: 'Escape', show: 'b', points: [1], resultingPos: 'n', },
    { code: 'rev', title: 'Reversal', show: 'b', points: [2], resultingPos: 't', },
    { code: 'nf2', title: 'Near Fall 2', show: 't', points: [2], },
    { code: 'nf3', title: 'Near Fall 3', show: 't', points: [3], },
    { code: 'nf4', title: 'Near Fall 4', show: 't', points: [4], },
    { code: 'stall', title: 'Stall', oppPoints: [0, 1, 1, 2, 'dq'], },
    { code: 'caution', title: 'Caution', oppPoints: [0, 0, 1], },
    { code: 'tech', title: 'Tech', oppPoints: [1, 1, 2, 2, 'dq'], },
    { code: 'unsport', title: 'Unsportsmanlike', oppPoints: [1, 1, 2, 2, 'dq'], },
  ] as ActionEntry[],
  Freestyle: [
    { code: '+1', title: '1', points: [1], },
    { code: '+2', title: '2', points: [2], },
    { code: '+3', title: '3', points: [3], },
    { code: '+4', title: '4', points: [4], },
    { code: '+5', title: '5', points: [5], },
    { code: 'caution', title: 'Caution', oppPoints: [2, 2, 'dq'], },
    { code: 'passivity', title: 'Passivity', oppPoints: [0], },
  ] as ActionEntry[],
  Greco: [
    { code: '+1', title: '1', points: [1], },
    { code: '+2', title: '2', points: [2], },
    { code: '+3', title: '3', points: [3], },
    { code: '+4', title: '4', points: [4], },
    { code: '+5', title: '5', points: [5], },
    { code: 'caution', title: 'Caution', oppPoints: [2, 2, 'dq'], },
    { code: 'passivity', title: 'Passivity', oppPoints: [0], },
  ] as ActionEntry[],

}
