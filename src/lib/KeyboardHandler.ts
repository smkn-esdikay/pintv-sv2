export type KeyAction = 'left' | 'up' | 'down' | 'right' | 'space';

interface KeyboardHandlerConfig {
  onLeft?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onRight?: () => void;
  onSpace?: () => void;
  enabled?: boolean;
}

export class KeyboardHandler {
  private config: KeyboardHandlerConfig;
  private isEnabled: boolean = true;
  private boundHandler: (event: KeyboardEvent) => void;

  constructor(config: KeyboardHandlerConfig = {}) {
    this.config = config;
    this.isEnabled = config.enabled ?? true;
    
    // Bind the handler so we can add/remove it properly
    this.boundHandler = this.handleKeyDown.bind(this);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;

    const shouldHandle = this.shouldHandleKey(event.key);
    if (!shouldHandle) return;

    event.preventDefault();
    this.executeAction(event.key);
  }

  private shouldHandleKey(key: string): boolean {
    const targetKeys = ['ArrowLeft', 'ArrowDown', 'ArrowRight', ' '];
    return targetKeys.includes(key);
  }

  private executeAction(key: string): void {
    switch (key) {
      case 'ArrowLeft':
        this.config.onLeft?.();
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

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // Update handlers
  updateConfig(newConfig: Partial<KeyboardHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  setHandler(action: KeyAction, handler: () => void): void {
    switch (action) {
      case 'left':
        this.config.onLeft = handler;
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

  // convenience
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
  }
}
