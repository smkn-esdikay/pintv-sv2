import { writable, type Writable } from 'svelte/store';
import { co } from './console';

export type InputMode = 'normal' | 'modal' | 'editing' | 'disabled';

interface ModeRequest {
  componentId: string;
  mode: InputMode;
  priority: number;
  timestamp: number;
}

interface InputModeState {
  currentMode: InputMode;
  requestStack: ModeRequest[];
  activeRequests: Map<string, ModeRequest>;
}

const MODE_PRIORITIES: Record<InputMode, number> = {
  'disabled': 1000,  // Highest priority - emergency override
  'modal': 100,      // High priority - modal dialogs
  'editing': 50,     // Medium priority - text inputs
  'normal': 10       // Lowest priority - default state
};

class InputModeManager {
  private static instance: InputModeManager | null = null;
  
  private state: Writable<InputModeState> = writable({
    currentMode: 'normal',
    requestStack: [],
    activeRequests: new Map()
  });

  private subscribers: Set<(mode: InputMode) => void> = new Set();
  private debugMode: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): InputModeManager {
    if (!InputModeManager.instance) {
      InputModeManager.instance = new InputModeManager();
    }
    return InputModeManager.instance;
  }

  // Public API

  /**
   * Request a specific input mode
   * @param mode The desired input mode
   * @param componentId Unique identifier for the requesting component
   * @param options Additional options
   */
  requestMode(
    mode: InputMode, 
    componentId: string, 
    options: { priority?: number; force?: boolean } = {}
  ): void {
    const priority = options.priority ?? MODE_PRIORITIES[mode];
    const timestamp = Date.now();

    const request: ModeRequest = {
      componentId,
      mode,
      priority,
      timestamp
    };

    this.state.update(state => {
      // Remove any existing request from this component
      if (state.activeRequests.has(componentId)) {
        const oldRequest = state.activeRequests.get(componentId)!;
        state.requestStack = state.requestStack.filter(r => r.componentId !== componentId);
      }

      // Add new request
      state.activeRequests.set(componentId, request);
      state.requestStack.push(request);

      // Sort by priority (highest first), then by timestamp (newest first)
      state.requestStack.sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return b.timestamp - a.timestamp;
      });

      // Update current mode to highest priority request
      const newMode = state.requestStack[0]?.mode ?? 'normal';
      
      if (state.currentMode !== newMode || options.force) {
        this.logStateChange(state.currentMode, newMode, componentId, 'request');
        state.currentMode = newMode;
        this.notifySubscribers(newMode);
      }

      return state;
    });
  }

  /**
   * Release a mode request from a component
   * @param componentId The component releasing its request
   */
  releaseMode(componentId: string): void {
    this.state.update(state => {
      const hadRequest = state.activeRequests.has(componentId);
      
      if (hadRequest) {
        // Remove from active requests and stack
        state.activeRequests.delete(componentId);
        state.requestStack = state.requestStack.filter(r => r.componentId !== componentId);

        // Determine new mode
        const oldMode = state.currentMode;
        const newMode = state.requestStack[0]?.mode ?? 'normal';

        if (oldMode !== newMode) {
          this.logStateChange(oldMode, newMode, componentId, 'release');
          state.currentMode = newMode;
          this.notifySubscribers(newMode);
        }
      }

      return state;
    });
  }

  /**
   * Force set a specific mode (emergency override)
   * @param mode The mode to force
   * @param reason Optional reason for debugging
   */
  forceMode(mode: InputMode, reason?: string): void {
    this.requestMode(mode, '__FORCE__', { 
      priority: MODE_PRIORITIES['disabled'] + 100,
      force: true 
    });
    
    if (reason && this.debugMode) {
      co.warn(`InputModeManager: Force mode set to '${mode}' - ${reason}`);
    }
  }

  /**
   * Clear all mode requests and return to normal
   */
  reset(): void {
    this.state.update(state => {
      const oldMode = state.currentMode;
      state.activeRequests.clear();
      state.requestStack = [];
      state.currentMode = 'normal';
      
      if (oldMode !== 'normal') {
        this.logStateChange(oldMode, 'normal', '__SYSTEM__', 'reset');
        this.notifySubscribers('normal');
      }
      
      return state;
    });
  }

  /**
   * Subscribe to mode changes
   * @param callback Function to call when mode changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (mode: InputMode) => void): () => void {
    this.subscribers.add(callback);
    
    // Immediately call with current mode
    this.state.subscribe(state => {
      callback(state.currentMode);
    })();
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get current mode (non-reactive)
   */
  getCurrentMode(): InputMode {
    let currentMode: InputMode = 'normal';
    this.state.subscribe(state => {
      currentMode = state.currentMode;
    })();
    return currentMode;
  }

  /**
   * Get reactive store for current mode
   */
  get mode(): Writable<InputMode> {
    return {
      subscribe: (callback) => {
        return this.state.subscribe(state => {
          callback(state.currentMode);
        });
      },
      set: () => {
        throw new Error('InputModeManager mode is read-only. Use requestMode() instead.');
      },
      update: () => {
        throw new Error('InputModeManager mode is read-only. Use requestMode() instead.');
      }
    };
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Get debug information about current state
   */
  getDebugInfo(): {
    currentMode: InputMode;
    activeRequests: Array<{ componentId: string; mode: InputMode; priority: number }>;
    requestStack: Array<{ componentId: string; mode: InputMode; priority: number }>;
  } {
    let debugInfo: any = {};
    
    this.state.subscribe(state => {
      debugInfo = {
        currentMode: state.currentMode,
        activeRequests: Array.from(state.activeRequests.entries()).map(([id, req]) => ({
          componentId: id,
          mode: req.mode,
          priority: req.priority
        })),
        requestStack: state.requestStack.map(req => ({
          componentId: req.componentId,
          mode: req.mode,
          priority: req.priority
        }))
      };
    })();
    
    return debugInfo;
  }

  // Private methods

  private notifySubscribers(mode: InputMode): void {
    this.subscribers.forEach(callback => {
      try {
        callback(mode);
      } catch (error) {
        co.error('InputModeManager: Error in subscriber callback', error);
      }
    });
  }

  private logStateChange(
    from: InputMode, 
    to: InputMode, 
    componentId: string, 
    action: 'request' | 'release' | 'reset'
  ): void {
    if (this.debugMode) {
      co.log('info', `InputMode: ${from} → ${to}`, {
        action,
        componentId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Static cleanup method
  static destroy(): void {
    if (InputModeManager.instance) {
      InputModeManager.instance.reset();
      InputModeManager.instance.subscribers.clear();
      InputModeManager.instance = null;
    }
  }
}

// Create and export singleton instance
export const inputModeManager = InputModeManager.getInstance();

// Helper functions for common use cases

/**
 * Hook for components that need to request a mode during their lifecycle
 * @param mode The mode to request
 * @param componentId Unique identifier for the component
 * @param enabled Whether the mode request should be active
 */
export function useInputMode(mode: InputMode, componentId: string, enabled: boolean = true): void {
  if (enabled) {
    inputModeManager.requestMode(mode, componentId);
  } else {
    inputModeManager.releaseMode(componentId);
  }
}

/**
 * Check if keyboard input should be blocked for the current mode
 * @param currentMode The current input mode
 * @returns true if keyboard input should be blocked
 */
export function shouldBlockKeyboard(currentMode: InputMode): boolean {
  return currentMode !== 'normal';
}

/**
 * Check if a specific mode is currently active
 * @param mode The mode to check
 * @returns true if the mode is currently active
 */
export function isInputMode(mode: InputMode): boolean {
  return inputModeManager.getCurrentMode() === mode;
}