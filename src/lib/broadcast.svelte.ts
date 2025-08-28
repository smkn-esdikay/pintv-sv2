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

  sendState(
    channelName: string, 
    data: WStateMain & { matchPoints: { l: number; r: number } }
  ) {
    try {
      const channel = this.getOrCreateChannel(channelName);

      const pl: WStateMainPublicDisplay = JSON.parse(JSON.stringify({
        ...data,
        // config: data.config,
        // clockInfo: data.clockInfo,
        clockStates: {
          mc: data.clocks.mc.getState(),
          rest: data.clocks.rest ? data.clocks.rest.getState() : undefined,
          shotclock: data.clocks.shotclock ? data.clocks.shotclock.getState() : undefined,
          ride: data.clocks.ride ? data.clocks.ride.getState() : undefined,
        },
        l: {
          ...data.l,
          // color: data.l.color,
          // pos: data.l.pos,
          // teamName: data.l.teamName,
          // teamNameAbbr: data.l.teamNameAbbr,
          // athleteName: data.l.athleteName,
          // winbyIdx: data.l.winbyIdx,
          clockStates: {
            blood: data.l.clocks.blood ? {...data.l.clocks.blood.getState()} : undefined,
            injury: data.l.clocks.injury ? data.l.clocks.injury.getState() : undefined,
            recovery: data.l.clocks.recovery ? data.l.clocks.recovery.getState() : undefined,
            headneck: data.l.clocks.headneck ? data.l.clocks.headneck.getState() : undefined,
          },
        },
        r: {
          ...data.r,
          // color: data.r.color,
          // pos: data.r.pos,
          // teamName: data.r.teamName,
          // teamNameAbbr: data.r.teamNameAbbr,
          // athleteName: data.r.athleteName,
          // winbyIdx: data.r.winbyIdx,
          clockStates: {
            blood: data.r.clocks.blood ? data.r.clocks.blood.getState() : undefined,
            injury: data.r.clocks.injury ? data.r.clocks.injury.getState() : undefined,
            recovery: data.r.clocks.recovery ? data.r.clocks.recovery.getState() : undefined,
            headneck: data.r.clocks.headneck ? data.r.clocks.headneck.getState() : undefined,
          },
        },
        // periodIdx: data.periodIdx,
        // mustChoosePosition: data.mustChoosePosition,
        // sideThatChosePosition: data.sideThatChosePosition,
        // defer: data.defer,
        // matchPoints: data.matchPoints,
      }));
      
      channel.postMessage(pl);
      // co.debug(`(sendState) Sent to ${channelName}:`, pl);
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

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    broadcast.cleanup();
  });
}
