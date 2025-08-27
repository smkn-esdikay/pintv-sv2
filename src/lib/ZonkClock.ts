import { writable, type Writable } from 'svelte/store';

export interface ZonkClockState {
  max: number;
  started: number | null;
  stopped: number | null;
  timestampUponComplete: number | null;
  durStop: number;
  durRun: number;
}

export class ZonkClock {

  private max: number = 0;
  private started: number | null = null; 
  private stopped: number | null = null; 
  private timestampUponComplete: number | null = null; 
  private durStop: number = 0;
  private durRun: number = 0;
  
  public elapsed: Writable<number> = writable(0);
  public remaining: Writable<number> = writable(0);
  public isRunning: Writable<boolean> = writable(false);
  public isComplete: Writable<boolean> = writable(false);
  
  private updateLoop: number | null = null;

  constructor(max: number) {
    this.max = max;
    this.remaining.set(max);
  }

  public start() {

    let complete = false;
    this.isComplete.subscribe(val => complete = val)();
    if (complete) return;
    
    this.started = Date.now();
    
    if (this.stopped) {
      this.durStop += this.started - this.stopped;
    }
    
    this.isRunning.set(true);
    this.startUpdateLoop();
  }

  public stop() {

    let running = false;
    this.isRunning.subscribe(val => running = val)();
    
    if (!this.started || !running) return;
    
    this.stopped = Date.now();
    this.durRun += this.stopped - this.started;
    this.isRunning.set(false);
    
    this.stopUpdateLoop();
    this.updateStores();
    
    // Check completion and update store
    if (this.getTotalElapsed() >= this.max) {
      this.timestampUponComplete = this.stopped;
      this.isComplete.set(true);
    }
  }

  public reset() {
    this.stopUpdateLoop();
    
    this.started = null;
    this.stopped = null;
    this.timestampUponComplete = null;
    this.durStop = 0;
    this.durRun = 0;
    
    this.elapsed.set(0);
    this.remaining.set(this.max);
    this.isRunning.set(false);
    this.isComplete.set(false);
  }

  public getState(): ZonkClockState {
    return {
      max: this.max,
      started: this.started,
      stopped: this.stopped,
      timestampUponComplete: this.timestampUponComplete,
      durStop: this.durStop,
      durRun: this.durRun
    };
  }

  public restoreState(state: ZonkClockState): void {
    this.stopUpdateLoop();
    
    this.max = state.max;
    this.started = state.started;
    this.stopped = state.stopped;
    this.timestampUponComplete = state.timestampUponComplete;
    this.durStop = state.durStop;
    this.durRun = state.durRun;
    
    this.updateStores();
    
    const shouldBeRunning = this.started !== null && 
      this.stopped === null && 
      this.timestampUponComplete === null;
    
    const shouldBeComplete = this.timestampUponComplete !== null;
    
    this.isRunning.set(shouldBeRunning);
    this.isComplete.set(shouldBeComplete);
    
    if (shouldBeRunning) {
      this.startUpdateLoop();
    }
  }

  public static fromState(state: ZonkClockState): ZonkClock {
    const clock = new ZonkClock(state.max);
    clock.restoreState(state);
    return clock;
  }

  private startUpdateLoop() {
    if (this.updateLoop) return;
    
    const update = () => {
      let running = false;
      this.isRunning.subscribe(val => running = val)();
      
      if (running) {
        this.updateStores();
        
        if (this.getTotalElapsed() >= this.max) {
          this.timestampUponComplete = Date.now();
          this.isComplete.set(true);
          this.stop();
          return;
        }
        
        this.updateLoop = requestAnimationFrame(update);
      }
    };
    
    this.updateLoop = requestAnimationFrame(update);
  }
  
  private stopUpdateLoop() {
    if (this.updateLoop) {
      cancelAnimationFrame(this.updateLoop);
      this.updateLoop = null;
    }
  }
  
  private updateStores() {
    const totalElapsed = this.getTotalElapsed();
    const remainingTime = Math.max(0, this.max - totalElapsed);
    
    this.elapsed.set(totalElapsed);
    this.remaining.set(remainingTime);
  }

  public getTotalElapsed(): number {
    let total = this.durRun;
    if (this.started) {
      // Check if currently running from store
      let running = false;
      this.isRunning.subscribe(val => running = val)();
      if (running) {
        total += Date.now() - this.started;
      }
    }
    return total;
  }

  public getRemainingTime(): number {
    return Math.max(0, this.max - this.getTotalElapsed());
  }

  public destroy() {
    this.stopUpdateLoop();
  }
}