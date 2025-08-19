import { co } from './console';

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
      const channel = new BroadcastChannel(`pintv_${name}`);
      this.channels.set(name, channel);
      co.debug(`Created channel: pintv_${name}`);
    }
    return this.channels.get(name)!;
  }

  send(channelName: string, data: any) {
    try {
      const channel = this.getOrCreateChannel(channelName);
      
      const serializedData = JSON.parse(JSON.stringify(data, (key, value) => {

        if (value && typeof value === 'object' && value.constructor?.name === 'ZonkClock') {
          return {
            timeLeft: value.getRemainingTime(), 
            elapsed: value.getTotalElapsed(),
            isRunning: this.getStoreValue(value.isRunning),
            isComplete: this.getStoreValue(value.isComplete)
          };
        }
        
        if (value && typeof value === 'object' && value.constructor?.name === 'RidingClock') {
          return {
            netTime: value.getNetTime(),
            isRunning: this.getStoreValue(value.isRunning),
            currentSide: value.getCurrentSide(),
            advantage: value.getAdvantage(),
            leftAdvantageTime: value.getAdvantageTime('l'),
            rightAdvantageTime: value.getAdvantageTime('r')
          };
        }
        
        // Handle Svelte stores
        if (value && typeof value === 'object' && value.subscribe) {
          return this.getStoreValue(value);
        }
        
        return value;
      }));
      
      channel.postMessage(serializedData);
      co.debug(`Sent to ${channelName}:`, serializedData);
    } catch (error) {
      co.error(`Failed to send to ${channelName}:`, error);
    }
  }

  private getStoreValue(store: any): any {
    let value: any;
    const unsubscribe = store.subscribe((val: any) => value = val);
    unsubscribe();
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

// Helper functions for specific broadcast types
export function broadcastWrestlingState(state: any) {
  broadcast.send('scoreboard', {
    type: 'state',
    data: state,
    timestamp: Date.now()
  });
}

export function broadcastClockStart(clockId: string, timeLeft: number) {
  broadcast.send('clock', {
    type: 'start',
    clockId,
    timeLeft,
    timestamp: Date.now()
  });
}

export function broadcastClockStop(clockId: string) {
  broadcast.send('clock', {
    type: 'stop',
    clockId,
    timestamp: Date.now()
  });
}

export function broadcastClockReset(clockId: string, timeLeft: number) {
  broadcast.send('clock', {
    type: 'reset',
    clockId,
    timeLeft,
    timestamp: Date.now()
  });
}

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
      broadcast.send('control', 'request_data');
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