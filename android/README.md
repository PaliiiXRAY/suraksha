# Android Capacitor Wrapper (MeshNative)

This directory contains the Capacitor Android wrapper and the Kotlin native plugin (`MeshNative`).

### Responsibilities (§7 of SRS):
- `startForegroundService()` / `stopForegroundService()`: Keeps discovery and peer mesh alive with the screen off.
- `startDiscovery()` / `stopDiscovery()`: Google Nearby Connections advertise + scan.
- `connect(peerId)`, `send(bytes)`, `onReceive`: Byte pipe to nearby peers.
- `sendSms(number, text)`: Emergency SOS cellular fallback.

