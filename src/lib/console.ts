// src/lib/console.ts

type ColorStyle = 
  | 'primary' | 'info' | 'success' | 'error' | 'warn' | 'debug'
  | 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'cyan'
  | 'fire' | 'electric' | 'neon' | 'cosmic' | 'matrix' | 'glow'
  | 'muted' | 'bold' | 'subtle';

interface LoggerConfig {
  enabled: boolean;
  timestamp: boolean;
  groupSimilar: boolean;
}

const CSS_STYLES: Record<ColorStyle, string> = {
  // Standard levels
  primary: 'color: #007bff; font-weight: 500;',
  info: 'color: #17a2b8;',
  success: 'color: #28a745; font-weight: 500;',
  error: 'color: #dc3545; font-weight: bold;',
  warn: 'color: #ffc107; background: #2a2a2a; font-weight: 500;',
  debug: 'color: #6c757d; font-style: italic;',
  
  // Basic colors
  red: 'color: #e74c3c;',
  green: 'color: #27ae60;',
  blue: 'color: #3498db;',
  yellow: 'color: #f1c40f;',
  orange: 'color: #e67e22;',
  purple: 'color: #9b59b6;',
  cyan: 'color: #1abc9c;',
  
  // Special effects
  fire: 'color: #ff4757; text-shadow: 0 0 4px #ff4757;',
  electric: 'color: #00d2ff; text-shadow: 0 0 3px #00d2ff;',
  neon: 'color: #ff073a; background: #000; text-shadow: 0 0 8px #ff073a;',
  cosmic: 'color: #ffd700; background: #1a1a2e; text-shadow: 0 0 6px #ffd700;',
  matrix: 'color: #00ff00; background: #000; font-family: monospace;',
  glow: 'color: #00cec9; text-shadow: 0 0 8px #00cec9;',
  
  // Utility styles
  muted: 'color: #6c757d; background: #f8f9fa;',
  bold: 'color: #2d3436; background: #ffeaa7; font-weight: bold;',
  subtle: 'color: #636e72; font-style: italic;'
};

class ConsoleLogger {
  private config: LoggerConfig = {
    enabled: true,
    timestamp: false,
    groupSimilar: false
  };

  configure(options: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...options };
  }

  private getTimestamp(): string {
    return new Date().toLocaleTimeString('en-US', { hour12: false });
  }

  private formatMessage(style: ColorStyle, message: string): [string, string] {
    const baseStyle = CSS_STYLES[style] || CSS_STYLES.info;
    const styledMessage = this.config.timestamp 
      ? `[${this.getTimestamp()}] ${message}`
      : message;
    
    return [`%c${styledMessage}`, `${baseStyle} padding: 2px 4px; border-radius: 3px;`];
  }

  log(styleOrMessage: ColorStyle | string, message?: string, ...args: any[]): void {
    if (!this.config.enabled) return;

    const [style, msg, additionalArgs] = message !== undefined
      ? [styleOrMessage as ColorStyle, message, args]
      : ['info' as ColorStyle, styleOrMessage as string, args];

    const [formattedMsg, styleStr] = this.formatMessage(style, msg);
    
    console.log(formattedMsg, styleStr, ...additionalArgs);
    
    // Log complex objects separately for better inspection
    // const complexArgs = additionalArgs.filter(arg => 
    //   arg !== null && typeof arg === 'object'
    // );
    // if (complexArgs.length > 0) {
    //   console.log(...complexArgs);
    // }
  }

  // Convenience methods
  info = (message: string, ...args: any[]) => this.log('info', message, ...args);
  success = (message: string, ...args: any[]) => this.log('success', message, ...args);
  error = (message: string, ...args: any[]) => this.log('error', message, ...args);
  warn = (message: string, ...args: any[]) => this.log('warn', message, ...args);
  debug = (message: string, ...args: any[]) => this.log('debug', message, ...args);

  // Special effect methods
  fire = (message: string, ...args: any[]) => this.log('fire', message, ...args);
  electric = (message: string, ...args: any[]) => this.log('electric', message, ...args);
  neon = (message: string, ...args: any[]) => this.log('neon', message, ...args);
  cosmic = (message: string, ...args: any[]) => this.log('cosmic', message, ...args);
  matrix = (message: string, ...args: any[]) => this.log('matrix', message, ...args);
  glow = (message: string, ...args: any[]) => this.log('glow', message, ...args);

  // Group logging
  group(title: string, style: ColorStyle = 'primary'): void {
    if (!this.config.enabled) return;
    const [formattedMsg, styleStr] = this.formatMessage(style, title);
    console.group(formattedMsg, styleStr);
  }

  groupEnd(): void {
    if (!this.config.enabled) return;
    console.groupEnd();
  }

  // Table logging for objects/arrays
  table(data: any, title?: string): void {
    if (!this.config.enabled) return;
    if (title) this.info(title);
    console.table(data);
  }
}

// Create singleton instance
export const co = new ConsoleLogger();

// Configure for development/production
if (typeof window !== 'undefined') {
  // Browser environment - check for dev mode
  const isDev = import.meta.env?.DEV || 
                localStorage.getItem('debug') === 'true' ||
                window.location.hostname === 'localhost';
  
  co.configure({ 
    enabled: isDev,
    timestamp: false,
    groupSimilar: false
  });
}

// Export types for TypeScript users
export type { ColorStyle, LoggerConfig };