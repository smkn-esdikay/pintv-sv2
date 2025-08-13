import { writable, type Writable } from 'svelte/store';

// Re-declare types here to avoid circular dependencies
type WSide = 'l' | 'r';

export interface RidingClockState {
  netTime: number;        // milliseconds, positive = right advantage, negative = left advantage
  isRunning: boolean;
  lastTickTime: number;   // timestamp of last update
  lastActiveSide: WSide | null; // who was last on top (for switching logic)
}

export class RidingClock {
  private state: RidingClockState = {
    netTime: 0,
    isRunning: false,
    lastTickTime: Date.now(),
    lastActiveSide: null
  };

  // Reactive stores for UI
  public netTime: Writable<number> = writable(0);
  public isRunning: Writable<boolean> = writable(false);
  
  private updateLoop: number | null = null;

  constructor() {
    this.updateStores();
  }

  /**
   * Start tracking riding time for the specified side
   * @param side - Which wrestler is on top ('l' or 'r')
   */
  public startForSide(side: WSide): void {
    const now = Date.now();
    
    this.state = {
      ...this.state,
      lastActiveSide: side,
      isRunning: true,
      lastTickTime: now
    };
    
    this.updateStores();
    this.startUpdateLoop();
  }

  /**
   * Stop tracking (when position becomes neutral)
   */
  public stop(): void {
    if (this.state.isRunning) {
      this.updateNetTime(); // Final update before stopping
      this.state = {
        ...this.state,
        isRunning: false,
        lastActiveSide: null
      };
      
      this.updateStores();
      this.stopUpdateLoop();
    }
  }

  /**
   * Switch which side is on top (for position changes)
   * @param newSide - The new side that's on top
   */
  public switchToSide(newSide: WSide): void {
    if (this.state.isRunning) {
      this.updateNetTime(); // Update with current side before switching
    }
    
    const now = Date.now();
    this.state = {
      ...this.state,
      lastActiveSide: newSide,
      isRunning: true,
      lastTickTime: now
    };
    
    this.updateStores();
    if (!this.updateLoop) {
      this.startUpdateLoop();
    }
  }

  /**
   * Reset to zero net time
   */
  public reset(): void {
    this.stopUpdateLoop();
    
    this.state = {
      netTime: 0,
      isRunning: false,
      lastTickTime: Date.now(),
      lastActiveSide: null
    };
    
    this.updateStores();
  }

  /**
   * Set the net time directly (for editing)
   * @param netTimeMs - New net time in milliseconds
   */
  public setNetTime(netTimeMs: number): void {
    this.state = {
      ...this.state,
      netTime: netTimeMs,
      lastTickTime: Date.now()
    };
    
    this.updateStores();
  }

  /**
   * Swap the advantage (multiply net time by -1)
   */
  public swapAdvantage(): void {
    this.state = {
      ...this.state,
      netTime: -this.state.netTime
    };
    
    this.updateStores();
  }

  /**
   * Get current net time (non-reactive)
   */
  public getNetTime(): number {
    if (this.state.isRunning) {
      this.updateNetTime();
    }
    return this.state.netTime;
  }

  /**
   * Get current state (non-reactive)
   */
  public getState(): RidingClockState {
    if (this.state.isRunning) {
      this.updateNetTime();
    }
    return { ...this.state };
  }

  public getAdvantage(): WSide | null {
    const netTime = this.getNetTime();
    if (netTime > 0) return 'r';  // Positive = right advantage
    if (netTime < 0) return 'l';  // Negative = left advantage
    return null;
  }

  public getCurrentSide(): WSide | null {
    return this.state.isRunning ? this.state.lastActiveSide : null;
  }

  /**
   * Get advantage time in seconds for the specified side
   * @param side - Which side to get advantage for
   * @returns Positive number of seconds of advantage, or 0 if no advantage
   */
  public getAdvantageTime(side: WSide): number {
    const netTime = this.getNetTime();
    const advantageMs = side === 'r' ? Math.max(0, netTime) : Math.max(0, -netTime);
    return Math.floor(advantageMs / 1000);
  }

  private updateNetTime(): void {
    if (!this.state.isRunning || !this.state.lastActiveSide) return;
    
    const now = Date.now();
    const elapsed = now - this.state.lastTickTime;
    
    // Add time if right is on top, subtract if left is on top
    const timeChange = this.state.lastActiveSide === 'r' ? elapsed : -elapsed;
    
    this.state = {
      ...this.state,
      netTime: this.state.netTime + timeChange,
      lastTickTime: now
    };
  }

  private startUpdateLoop(): void {
    if (this.updateLoop) return;
    
    const update = () => {
      if (this.state.isRunning) {
        this.updateNetTime();
        this.updateStores();
        this.updateLoop = requestAnimationFrame(update);
      }
    };
    
    this.updateLoop = requestAnimationFrame(update);
  }

  private stopUpdateLoop(): void {
    if (this.updateLoop) {
      cancelAnimationFrame(this.updateLoop);
      this.updateLoop = null;
    }
  }

  private updateStores(): void {
    this.netTime.set(this.state.netTime);
    this.isRunning.set(this.state.isRunning);
  }

  public destroy(): void {
    this.stopUpdateLoop();
  }
}

// Utility functions for formatting
export function formatRidingTime(timeMs: number): string {
  const absTime = Math.abs(timeMs);
  const minutes = Math.floor(absTime / 60000);
  const seconds = Math.floor((absTime % 60000) / 1000);
  // const centiseconds = Math.floor((absTime % 1000) / 10);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function msToRidingComponents(ms: number): { 
  minutes: number; 
  seconds: number; 
  centiseconds: number;
  isNegative: boolean;
} {
  const absTime = Math.abs(ms);
  const minutes = Math.floor(absTime / 60000);
  const seconds = Math.floor((absTime % 60000) / 1000);
  const centiseconds = Math.floor((absTime % 1000) / 10);
  
  return { 
    minutes, 
    seconds, 
    centiseconds,
    isNegative: ms < 0
  };
}

export function ridingComponentsToMs(
  minutes: number, 
  seconds: number, 
  centiseconds: number, 
  isNegative: boolean
): number {
  const ms = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
  return isNegative ? -ms : ms;
}