/**
 * Runtime Permissions Manager for SURAKSHA Android Mesh — SRS FR-39.
 *
 * Explains and orchestrates runtime permissions needed for:
 * - Location (BLE mesh beacon scanning on Android)
 * - Nearby Devices (Bluetooth Scan / Advertise / Connect)
 * - Background Notifications (Foreground service notification)
 * - Emergency SMS (SOS cellular fallback dispatch)
 */

import { Capacitor } from '@capacitor/core';
import { MeshNative, type MeshPermissionsStatus } from './nearby';

export interface PermissionExplanation {
  id: keyof Omit<MeshPermissionsStatus, 'allGranted'>;
  title: string;
  icon: string;
  purpose: string;
  mandatory: boolean;
}

export const PERMISSION_EXPLANATIONS: PermissionExplanation[] = [
  {
    id: 'location',
    title: 'Precise Location',
    icon: '📍',
    purpose:
      'Required by Android to discover local Wi-Fi and Bluetooth mesh peers. SURAKSHA operates peer-to-peer and never transmits your private coordinates to central servers.',
    mandatory: true,
  },
  {
    id: 'nearbyDevices',
    title: 'Nearby Devices (Bluetooth)',
    icon: '📡',
    purpose:
      'Enables direct device-to-device radio discovery and encrypted delta-sync with neighboring phones without cellular towers or internet access.',
    mandatory: true,
  },
  {
    id: 'notifications',
    title: 'Background Sync & Alerts',
    icon: '🔔',
    purpose:
      'Required for the ongoing Android Foreground Service so the disaster mesh can discover peers and receive emergency reports even when your screen is off.',
    mandatory: true,
  },
  {
    id: 'sms',
    title: 'Emergency SOS SMS Fallback',
    icon: '✉️',
    purpose:
      'Used strictly when you trigger an Emergency SOS in complete internet blackouts to relay distress coordinates to disaster authorities via SMS.',
    mandatory: false,
  },
];

export class PermissionsManager {
  /**
   * Check current status of all mesh permissions.
   */
  public static async checkStatus(): Promise<MeshPermissionsStatus> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return {
        location: true,
        nearbyDevices: true,
        notifications: true,
        sms: true,
        allGranted: true,
      };
    }

    try {
      return await MeshNative.checkMeshPermissions();
    } catch (err) {
      console.warn('[PermissionsManager] Error checking permissions:', err);
      return {
        location: false,
        nearbyDevices: false,
        notifications: false,
        sms: false,
        allGranted: false,
      };
    }
  }

  /**
   * Request mesh permissions with Android system dialogs.
   */
  public static async requestAll(): Promise<MeshPermissionsStatus> {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return {
        location: true,
        nearbyDevices: true,
        notifications: true,
        sms: true,
        allGranted: true,
      };
    }

    try {
      return await MeshNative.requestMeshPermissions();
    } catch (err) {
      console.error('[PermissionsManager] Error requesting permissions:', err);
      return await this.checkStatus();
    }
  }
}

