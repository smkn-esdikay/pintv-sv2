import { 
  inputModeManager, 
  shouldBlockKeyboard, 
  type InputMode 
} from './InputModeManager.svelte';
import { co } from './console';

export type KeyAction = 'left' | 'up' | 'down' | 'right' | 'space';

interface KeyboardHandlerConfig {
  onLeft?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onRight?: () => void;
  onSpace?: () => void;
  enabled?: boolean;

  // input mode
  componentId?: string;
  allowedModes?: InputMode[];
}

export class KeyboardHandler {
  private config: KeyboardHandlerConfig;
  private isEnabled: boolean = true;
  private boundHandler: (event: KeyboardEvent) => void;

  // input mode
  private componentId: string;
  private allowedModes: InputMode[];
  private inputModeUnsubscribe?: () => void;
  private currentInputMode: InputMode = 'normal';

  constructor(config: KeyboardHandlerConfig = {}) {
    this.config = config;
    this.isEnabled = config.enabled ?? true;

    // input mode
    this.componentId = config.componentId ?? `keyboard-handler-${Date.now()}`;
    this.allowedModes = config.allowedModes ?? ['normal']; // Default: only work in normal mode
    
    // Bind the handler so we can add/remove it properly
    this.boundHandler = this.handleKeyDown.bind(this);
    
    // Subscribe to input mode changes
    this.subscribeToInputMode();
  }

  private subscribeToInputMode(): void {
    this.inputModeUnsubscribe = inputModeManager.subscribe((mode: InputMode) => {
      this.currentInputMode = mode;
      
      if (this.config.componentId) {
        co.debug(`KeyboardHandler(${this.componentId}): Input mode changed to '${mode}'`, {
          allowedModes: this.allowedModes,
          willBlock: this.shouldBlockForInputMode(mode)
        });
      }
    });
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    if (this.shouldBlockForInputMode(this.currentInputMode)) {
      return;
    }

    const shouldHandle = this.shouldHandleKey(event.key);
    if (!shouldHandle) return;

    if (this.shouldBlockForContext(event)) {
      return;
    }

    event.preventDefault();
    this.executeAction(event.key);
  }

  private shouldBlockForInputMode(mode: InputMode): boolean {
    return !this.allowedModes.includes(mode);
  }

  private shouldBlockForContext(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement;
    
    if (target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    )) {
      return true;
    }

    if (!this.allowedModes.includes('modal')) {
      const modalParent = target?.closest('[role="dialog"], .modal, [data-modal]');
      if (modalParent) {
        return true;
      }
    }

    return false;
  }

  private shouldHandleKey(key: string): boolean {
    const targetKeys = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', ' '];
    return targetKeys.includes(key);
  }

  private executeAction(key: string): void {
    switch (key) {
      case 'ArrowLeft':
        this.config.onLeft?.();
        break;
      case 'ArrowUp':
        this.config.onUp?.();
        break;
      case 'ArrowDown':
        this.config.onDown?.();
        break;
      case 'ArrowRight':
        this.config.onRight?.();
        break;
      case ' ':
        this.config.onSpace?.();
        break;
    }
  }

  
  // Public API
  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update which input modes this handler should work in
   * @param modes Array of input modes where this handler should be active
   */
  setAllowedModes(modes: InputMode[]): void {
    this.allowedModes = modes;
    co.debug(`KeyboardHandler(${this.componentId}): Allowed modes updated`, modes);
  }

  /**
   * Add an input mode to the allowed list
   * @param mode Input mode to allow
   */
  allowMode(mode: InputMode): void {
    if (!this.allowedModes.includes(mode)) {
      this.allowedModes.push(mode);
      co.debug(`KeyboardHandler(${this.componentId}): Added allowed mode '${mode}'`);
    }
  }

  /**
   * Remove an input mode from the allowed list
   * @param mode Input mode to disallow
   */
  disallowMode(mode: InputMode): void {
    const index = this.allowedModes.indexOf(mode);
    if (index > -1) {
      this.allowedModes.splice(index, 1);
      co.debug(`KeyboardHandler(${this.componentId}): Removed allowed mode '${mode}'`);
    }
  }

  /**
   * Check if the handler would currently process keyboard events
   */
  isCurrentlyActive(): boolean {
    return this.isEnabled && 
           this.allowedModes.includes(this.currentInputMode) &&
           !shouldBlockKeyboard(this.currentInputMode);
  }

  // Update handlers
  updateConfig(newConfig: Partial<KeyboardHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.allowedModes) {
      this.allowedModes = newConfig.allowedModes;
    }
  }

  setHandler(action: KeyAction, handler: () => void): void {
    switch (action) {
      case 'left':
        this.config.onLeft = handler;
        break;
      case 'up':
        this.config.onUp = handler;
        break;
      case 'down':
        this.config.onDown = handler;
        break;
      case 'right':
        this.config.onRight = handler;
        break;
      case 'space':
        this.config.onSpace = handler;
        break;
    }
  }

  // Lifecycle
  attach(): void {
    document.addEventListener('keydown', this.boundHandler);
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundHandler);
  }

  start(): void {
    this.enable();
    this.attach();
  }

  stop(): void {
    this.disable();
    this.detach();
  }

  destroy(): void {
    this.stop();
    this.inputModeUnsubscribe?.();
    this.inputModeUnsubscribe = undefined;
  }
}

// Helper function to create a keyboard handler that automatically manages input modes
export function createSmartKeyboardHandler(
  config: KeyboardHandlerConfig,
  componentId?: string
): KeyboardHandler {
  return new KeyboardHandler({
    ...config,
    componentId: componentId ?? `smart-handler-${Date.now()}`,
    allowedModes: config.allowedModes ?? ['normal']
  });
}