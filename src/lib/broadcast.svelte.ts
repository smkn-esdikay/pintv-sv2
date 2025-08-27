import type { WStateMain, WStateMainPublicDisplay } from '@/types';
import { co } from './console';

const broadcastChannelPrefix = 'pintv_vsb';

class SimpleBroadcast {
  private static instance: SimpleBroadcast | null = null;
  private channels: Map<string, BroadcastChannel> = new Map();
  
  static getInstance(): SimpleBroadcast {
    if (!this.instance) {
      this.instance = new SimpleBroadcast();
    }
    return this.instance;
  }

  private getOrCreateChannel(name: string): BroadcastChannel {
    if (!this.channels.has(name)) {
      const channel = new BroadcastChannel(`${broadcastChannelPrefix}_${name}`);
      this.channels.set(name, channel);
      co.debug(`Created channel: ${broadcastChannelPrefix}_${name}`);
    }
    return this.channels.get(name)!;
  }

  sendGeneric(channelName: string, message: string) {
    try {
      const channel = this.getOrCreateChannel(channelName);
      channel.postMessage(message);
      co.debug(`(sendGeneric) Sent to ${channelName}:`, message);
    } catch (error) {
      co.error(`(sendGeneric) Failed to send to ${channelName}:`, error);
    }
  }

  sendState(channelName: string, data: WStateMain) {
    try {
      const channel = this.getOrCreateChannel(channelName);
      
      // const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {

      //   if (value && typeof value === 'object' && value.constructor?.name === 'ZonkClock') {
      //     return {
      //       timeLeft: value.getRemainingTime(), 
      //       elapsed: value.getTotalElapsed(),
      //       isRunning: this.peekStoreValue(value.isRunning),
      //       isComplete: this.peekStoreValue(value.isComplete)
      //     };
      //   }
        
      //   if (value && typeof value === 'object' && value.constructor?.name === 'RidingClock') {
      //     return {
      //       netTime: value.getNetTime(),
      //       isRunning: this.peekStoreValue(value.isRunning),
      //       currentSide: value.getCurrentSide(),
      //       advantage: value.getAdvantage(),
      //       leftAdvantageTime: value.getAdvantageTime('l'),
      //       rightAdvantageTime: value.getAdvantageTime('r')
      //     };
      //   }
        
      //   if (value && typeof value === 'object' && value.subscribe) {
      //     return this.peekStoreValue(value);
      //   }
        
      //   return value;
      // }));

      const pl: WStateMainPublicDisplay = {
        config: data.config,
        clockInfo: data.clockInfo,
        clockStates: {
          mc: data.clocks.mc.getState(),
          rest: data.clocks.rest ? data.clocks.rest.getState() : undefined,
          shotclock: data.clocks.shotclock ? data.clocks.shotclock.getState() : undefined,
          ride: data.clocks.ride ? data.clocks.ride.getState() : undefined,
        },
        l: {
          color: data.l.color,
          showChoosePos: data.l.showChoosePos,
          pos: data.l.pos,
          teamName: data.l.teamName,
          teamNameAbbr: data.l.teamNameAbbr,
          athleteName: data.l.athleteName,
          winbyIdx: data.l.winbyIdx,
          clockStates: {
            blood: data.l.clocks.blood ? data.l.clocks.blood.getState() : undefined,
            injury: data.l.clocks.injury ? data.l.clocks.injury.getState() : undefined,
            recovery: data.l.clocks.recovery ? data.l.clocks.recovery.getState() : undefined,
            headneck: data.l.clocks.headneck ? data.l.clocks.headneck.getState() : undefined,
          },
        },
        r: {
          color: data.r.color,
          showChoosePos: data.r.showChoosePos,
          pos: data.r.pos,
          teamName: data.r.teamName,
          teamNameAbbr: data.r.teamNameAbbr,
          athleteName: data.r.athleteName,
          winbyIdx: data.r.winbyIdx,
          clockStates: {
            blood: data.r.clocks.blood ? data.r.clocks.blood.getState() : undefined,
            injury: data.r.clocks.injury ? data.r.clocks.injury.getState() : undefined,
            recovery: data.r.clocks.recovery ? data.r.clocks.recovery.getState() : undefined,
            headneck: data.r.clocks.headneck ? data.r.clocks.headneck.getState() : undefined,
          },
        },
        periodIdx: data.periodIdx,
        defer: data.defer,
      }
      
      channel.postMessage(pl);
      co.debug(`(sendState) Sent to ${channelName}:`, pl);
    } catch (error) {
      co.error(`(sendState) Failed to send to ${channelName}:`, error);
    }
  }

  // get a value without staying subscribed
  private peekStoreValue(store: any): any {
    let value: any;
    const unsubscribe = store.subscribe((val: any) => value = val);
    unsubscribe(); // extract the value and unsubscribe immediately.
    return value;
  }

  listen(channelName: string, callback: (data: any) => void): () => void {
    const channel = this.getOrCreateChannel(channelName);
    
    const handler = (e: MessageEvent) => {
      try {
        callback(e.data);
      } catch (error) {
        co.error(`Error in ${channelName} listener:`, error);
      }
    };

    channel.addEventListener('message', handler);
    
    return () => {
      channel.removeEventListener('message', handler);
    };
  }

  openWindow(path: string, name: string, features?: string): Window | null {
    const defaultFeatures = 'width=1200,height=800,top=100,left=100,resizable=yes';
    const windowFeatures = features || defaultFeatures;
    
    try {
      const url = window.location.origin + window.location.pathname + path;
      const newWindow = window.open(url, name, windowFeatures);
      
      if (newWindow) {
        co.success(`Opened window: ${name}`);
        localStorage.setItem(`${name}Open`, '1');
        
        // Check for window close
        const checkClosed = setInterval(() => {
          if (newWindow.closed) {
            localStorage.setItem(`${name}Open`, '0');
            clearInterval(checkClosed);
            co.info(`Window closed: ${name}`);
          }
        }, 1000);
      }
      
      return newWindow;
    } catch (error) {
      co.error(`Failed to open window ${name}:`, error);
      return null;
    }
  }

  cleanup() {
    this.channels.forEach((channel, name) => {
      try {
        channel.close();
        co.debug(`Closed channel: ${name}`);
      } catch (error) {
        co.warn(`Error closing channel ${name}:`, error);
      }
    });
    this.channels.clear();
  }
}

// Export the singleton instance directly
export const broadcast = SimpleBroadcast.getInstance();


export function openScoreboard() {
  return broadcast.openWindow('#scoreboard-display', 'scoreboard');
}

/**
 * Broadcast receiver for scoreboard window - only needed in ScoreboardDisplay.svelte
 */
export function createScoreboardReceiver() {
  let stateData = $state<any>(null);
  let clockData = $state<any>(null);
  let unsubscribes: (() => void)[] = [];

  // This will be called from onMount in the component
  const initialize = () => {
    // Listen for state updates
    const unsubState = broadcast.listen('scoreboard', (message) => {
      if (message.type === 'state') {
        stateData = message.data;
        co.debug('Received state:', message.data);
      }
    });

    // Listen for clock events
    const unsubClock = broadcast.listen('clock', (message) => {
      clockData = message;
      co.debug('Received clock event:', message);
    });

    unsubscribes.push(unsubState, unsubClock);

    // Request initial data
    setTimeout(() => {
      broadcast.sendGeneric('control', 'request_data');
    }, 100);
  };

  const cleanup = () => {
    unsubscribes.forEach(unsub => unsub());
  };

  return {
    initialize,
    cleanup,
    get stateData() { return stateData; },
    get clockData() { return clockData; }
  };
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    broadcast.cleanup();
  });
}