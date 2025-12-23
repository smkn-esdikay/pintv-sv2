import { writable, type Writable } from 'svelte/store';
import { co } from './console';

export type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

export interface BluetoothDeviceInfo {
  id: string;
  name: string | undefined;
  device: BluetoothDevice;
  connected: boolean;
  lastConnected?: number;
}

interface BluetoothManagerState {
  connectionState: ConnectionState;
  connectedDevice: BluetoothDeviceInfo | null;
  discoveredDevices: BluetoothDeviceInfo[];
  error: string | null;
  isSupported: boolean;
}

// Common BLE service UUIDs for vibration devices
const VIBRATION_SERVICE_UUID = 0xFFE0; // Common for many BLE vibration devices
const VIBRATION_CHARACTERISTIC_UUID = 0xFFE1;

class BluetoothManager {
  private static instance: BluetoothManager | null = null;

  private state: Writable<BluetoothManagerState> = writable({
    connectionState: 'disconnected',
    connectedDevice: null,
    discoveredDevices: [],
    error: null,
    isSupported: typeof navigator !== 'undefined' && 'bluetooth' in navigator
  });

  private server: BluetoothRemoteGATTServer | null = null;
  private vibrationCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private debugMode: boolean = false;

  private constructor() {
    // Private constructor for singleton
    this.loadSavedDevices();
  }

  static getInstance(): BluetoothManager {
    if (!BluetoothManager.instance) {
      BluetoothManager.instance = new BluetoothManager();
    }
    return BluetoothManager.instance;
  }

  // Public API

  /**
   * Check if Web Bluetooth API is supported
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Scan for available Bluetooth devices
   * Opens the browser's device picker dialog
   */
  async scan(): Promise<BluetoothDeviceInfo | null> {
    if (!this.isSupported()) {
      this.setError('Web Bluetooth is not supported in this browser');
      return null;
    }

    this.updateState({ connectionState: 'scanning', error: null });

    try {
      const device = await navigator.bluetooth.requestDevice({
        // Accept all devices - adjust filters based on your specific device
        acceptAllDevices: true,
        optionalServices: [VIBRATION_SERVICE_UUID, 'battery_service']
      });

      const deviceInfo: BluetoothDeviceInfo = {
        id: device.id,
        name: device.name,
        device,
        connected: false
      };

      // Add to discovered devices if not already present
      this.state.update(state => {
        const exists = state.discoveredDevices.some(d => d.id === device.id);
        if (!exists) {
          state.discoveredDevices = [...state.discoveredDevices, deviceInfo];
        }
        return state;
      });

      this.updateState({ connectionState: 'disconnected' });
      this.log('Device selected:', device.name || device.id);

      return deviceInfo;
    } catch (error) {
      if ((error as Error).name === 'NotFoundError') {
        // User cancelled the picker
        this.updateState({ connectionState: 'disconnected' });
        this.log('Device selection cancelled');
        return null;
      }
      this.handleError('Scan failed', error);
      return null;
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connect(deviceInfo: BluetoothDeviceInfo): Promise<boolean> {
    if (!deviceInfo.device.gatt) {
      this.setError('Device does not support GATT');
      return false;
    }

    this.updateState({ connectionState: 'connecting', error: null });

    try {
      // Set up disconnect listener
      deviceInfo.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      // Connect to GATT server
      this.server = await deviceInfo.device.gatt.connect();
      this.log('Connected to GATT server');

      // Try to get vibration service
      try {
        const service = await this.server.getPrimaryService(VIBRATION_SERVICE_UUID);
        this.vibrationCharacteristic = await service.getCharacteristic(VIBRATION_CHARACTERISTIC_UUID);
        this.log('Vibration characteristic found');
      } catch {
        // Vibration service not found - device may use different UUIDs
        this.log('Standard vibration service not found - device may use custom UUIDs');
      }

      const updatedDeviceInfo: BluetoothDeviceInfo = {
        ...deviceInfo,
        connected: true,
        lastConnected: Date.now()
      };

      this.updateState({
        connectionState: 'connected',
        connectedDevice: updatedDeviceInfo
      });

      this.saveDevice(updatedDeviceInfo);
      this.log('Connected to:', deviceInfo.name || deviceInfo.id);

      return true;
    } catch (error) {
      this.handleError('Connection failed', error);
      return false;
    }
  }

  /**
   * Scan for and connect to a device in one step
   */
  async scanAndConnect(): Promise<boolean> {
    const device = await this.scan();
    if (device) {
      return this.connect(device);
    }
    return false;
  }

  /**
   * Disconnect from the current device
   */
  disconnect(): void {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.handleDisconnect();
  }

  /**
   * Reconnect to a previously paired device
   */
  async reconnect(deviceId: string): Promise<boolean> {
    const savedDevices = this.getSavedDevices();
    const savedDevice = savedDevices.find(d => d.id === deviceId);

    if (!savedDevice) {
      this.setError('Device not found in saved devices');
      return false;
    }

    // For Web Bluetooth, we need to request the device again
    // The browser may remember the pairing
    this.log('Attempting to reconnect to:', savedDevice.name || savedDevice.id);

    const device = await this.scan();
    if (device && device.id === deviceId) {
      return this.connect(device);
    }

    this.setError('Could not find the previously paired device. Please pair again.');
    return false;
  }

  /**
   * Forget a paired device (remove from saved devices)
   */
  forget(deviceId: string): void {
    // Disconnect if this is the current device
    const currentDevice = this.getConnectedDevice();
    if (currentDevice?.id === deviceId) {
      this.disconnect();
    }

    // Remove from saved devices
    const savedDevices = this.getSavedDevices();
    const filtered = savedDevices.filter(d => d.id !== deviceId);
    localStorage.setItem('bluetooth_devices', JSON.stringify(filtered));

    // Update discovered devices
    this.state.update(state => {
      state.discoveredDevices = state.discoveredDevices.filter(d => d.id !== deviceId);
      return state;
    });

    this.log('Device forgotten:', deviceId);
  }

  /**
   * Send a vibration command to the connected device
   * @param intensity 0-255 or 0-100 depending on device
   * @param duration Duration in milliseconds (optional)
   */
  async vibrate(intensity: number = 100, duration?: number): Promise<boolean> {
    if (!this.vibrationCharacteristic) {
      this.setError('Vibration characteristic not available');
      return false;
    }

    try {
      // Common command format - adjust based on your specific device protocol
      const command = new Uint8Array([intensity]);
      await this.vibrationCharacteristic.writeValue(command);

      if (duration) {
        setTimeout(async () => {
          await this.stopVibration();
        }, duration);
      }

      this.log('Vibration sent:', intensity);
      return true;
    } catch (error) {
      this.handleError('Vibration failed', error);
      return false;
    }
  }

  /**
   * Stop vibration
   */
  async stopVibration(): Promise<boolean> {
    return this.vibrate(0);
  }

  /**
   * Send raw data to the device
   * Useful for custom protocols
   */
  async sendRawData(data: Uint8Array): Promise<boolean> {
    if (!this.vibrationCharacteristic) {
      this.setError('Characteristic not available');
      return false;
    }

    try {
      await this.vibrationCharacteristic.writeValue(data);
      this.log('Raw data sent:', Array.from(data));
      return true;
    } catch (error) {
      this.handleError('Send failed', error);
      return false;
    }
  }

  /**
   * Get list of saved/previously paired devices
   */
  getSavedDevices(): Array<{ id: string; name: string | undefined; lastConnected?: number }> {
    try {
      const saved = localStorage.getItem('bluetooth_devices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get the currently connected device
   */
  getConnectedDevice(): BluetoothDeviceInfo | null {
    let device: BluetoothDeviceInfo | null = null;
    this.state.subscribe(state => {
      device = state.connectedDevice;
    })();
    return device;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    let connectionState: ConnectionState = 'disconnected';
    this.state.subscribe(state => {
      connectionState = state.connectionState;
    })();
    return connectionState;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: BluetoothManagerState) => void): () => void {
    return this.state.subscribe(callback);
  }

  /**
   * Get reactive store
   */
  get store(): Writable<BluetoothManagerState> {
    return this.state;
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  // Private methods

  private handleDisconnect(): void {
    this.server = null;
    this.vibrationCharacteristic = null;

    this.updateState({
      connectionState: 'disconnected',
      connectedDevice: null
    });

    this.log('Device disconnected');
  }

  private updateState(partial: Partial<BluetoothManagerState>): void {
    this.state.update(state => ({ ...state, ...partial }));
  }

  private setError(message: string): void {
    this.updateState({
      connectionState: 'error',
      error: message
    });
    co.error('BluetoothManager:', message);
  }

  private handleError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.setError(`${context}: ${message}`);
  }

  private saveDevice(device: BluetoothDeviceInfo): void {
    const saved = this.getSavedDevices();
    const existing = saved.findIndex(d => d.id === device.id);

    const deviceData = {
      id: device.id,
      name: device.name,
      lastConnected: device.lastConnected
    };

    if (existing >= 0) {
      saved[existing] = deviceData;
    } else {
      saved.push(deviceData);
    }

    localStorage.setItem('bluetooth_devices', JSON.stringify(saved));
  }

  private loadSavedDevices(): void {
    // Web Bluetooth doesn't allow auto-reconnection
    // We just load the saved device list for display purposes
    const saved = this.getSavedDevices();
    this.log('Loaded saved devices:', saved.length);
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      co.log('cyan', 'BluetoothManager:', ...args);
    }
  }

  // Static cleanup method
  static destroy(): void {
    if (BluetoothManager.instance) {
      BluetoothManager.instance.disconnect();
      BluetoothManager.instance = null;
    }
  }
}

// Create and export singleton instance
export const bluetoothManager = BluetoothManager.getInstance();
