package org.suraksha.mesh

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * MeshNative Capacitor Plugin — SRS §7 & Roadmap Phase 7.
 *
 * Bridges the TypeScript PWA and the Android native subsystem:
 * - Keeps peer discovery alive with the screen off via MeshForegroundService.
 * - Handles peer advertising, discovery, connection, and byte transfer via Nearby Connections.
 * - Dispatches emergency SOS SMS fallback via SmsHelper.
 * - Manages runtime permissions with rationale for Location, Bluetooth/Nearby, Notifications, and SMS.
 */
@CapacitorPlugin(
    name = "MeshNative",
    permissions = [
        Permission(
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ],
            alias = "location"
        ),
        Permission(
            strings = [
                Manifest.permission.POST_NOTIFICATIONS
            ],
            alias = "notifications"
        ),
        Permission(
            strings = [
                Manifest.permission.SEND_SMS
            ],
            alias = "sms"
        )
    ]
)
class MeshNativePlugin : Plugin(), NearbyMeshManager.MeshEventListener {

    private var meshManager: NearbyMeshManager? = null

    override fun load() {
        super.load()
        meshManager = NearbyMeshManager(context).apply {
            eventListener = this@MeshNativePlugin
        }
    }

    // ── Foreground Service ───────────────────────────────────────────────

    @PluginMethod
    fun startForegroundService(call: PluginCall) {
        try {
            MeshForegroundService.startService(context)
            val ret = JSObject()
            ret.put("success", true)
            ret.put("message", "Foreground service started")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start foreground service: ${e.message}")
        }
    }

    @PluginMethod
    fun stopForegroundService(call: PluginCall) {
        try {
            MeshForegroundService.stopService(context)
            val ret = JSObject()
            ret.put("success", true)
            ret.put("message", "Foreground service stopped")
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to stop foreground service: ${e.message}")
        }
    }

    // ── Nearby Connections Discovery & Sync ──────────────────────────────

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        val serviceId = call.getString("serviceId", "org.suraksha.mesh") ?: "org.suraksha.mesh"
        val customNodeId = call.getString("nodeId")
        if (!customNodeId.isNullOrEmpty()) {
            meshManager?.localNodeName = customNodeId
        }

        meshManager?.startMeshDiscovery(serviceId) { success, error ->
            if (success) {
                val ret = JSObject()
                ret.put("success", true)
                ret.put("serviceId", serviceId)
                call.resolve(ret)
            } else {
                call.reject(error ?: "Failed to start discovery")
            }
        } ?: call.reject("Mesh manager not initialized")
    }

    @PluginMethod
    fun stopDiscovery(call: PluginCall) {
        meshManager?.stopMeshDiscovery {
            val ret = JSObject()
            ret.put("success", true)
            call.resolve(ret)
        } ?: call.reject("Mesh manager not initialized")
    }

    @PluginMethod
    fun restartDiscovery(call: PluginCall) {
        val serviceId = call.getString("serviceId", "org.suraksha.mesh") ?: "org.suraksha.mesh"
        meshManager?.restartDiscoveryCycle(serviceId) { success, error ->
            val ret = JSObject()
            ret.put("success", success)
            if (error != null) ret.put("error", error)
            call.resolve(ret)
        } ?: call.reject("Mesh manager not initialized")
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val peerId = call.getString("peerId")
        if (peerId.isNullOrEmpty()) {
            call.reject("peerId is required")
            return
        }

        meshManager?.connectToPeer(peerId) { success, error ->
            if (success) {
                val ret = JSObject()
                ret.put("success", true)
                ret.put("peerId", peerId)
                call.resolve(ret)
            } else {
                call.reject(error ?: "Failed to connect to $peerId")
            }
        } ?: call.reject("Mesh manager not initialized")
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        val peerId = call.getString("peerId")
        if (peerId.isNullOrEmpty()) {
            call.reject("peerId is required")
            return
        }

        meshManager?.disconnectFromPeer(peerId)
        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun logEventRejection(call: PluginCall) {
        val eventId = call.getString("eventId") ?: "unknown"
        val reason = call.getString("reason") ?: "unknown"
        val peerId = call.getString("peerId") ?: "unknown"
        android.util.Log.w("MeshNative", "Rejected event $eventId from peer $peerId: $reason")
        val ret = JSObject()
        ret.put("success", true)
        call.resolve(ret)
    }

    @PluginMethod
    fun send(call: PluginCall) {
        val peerId = call.getString("peerId")
        val base64Data = call.getString("data")

        if (peerId.isNullOrEmpty()) {
            call.reject("peerId is required")
            return
        }
        if (base64Data.isNullOrEmpty()) {
            call.reject("data (base64) is required")
            return
        }

        try {
            val bytes = Base64.decode(base64Data, Base64.NO_WRAP)
            meshManager?.sendBytes(peerId, bytes) { success, error ->
                if (success) {
                    val ret = JSObject()
                    ret.put("success", true)
                    call.resolve(ret)
                } else {
                    call.reject(error ?: "Failed to send bytes to $peerId")
                }
            } ?: call.reject("Mesh manager not initialized")
        } catch (e: Exception) {
            call.reject("Failed to decode base64 data: ${e.message}")
        }
    }

    // ── Device GPS Location ───────────────────────────────────────────────

    @PluginMethod
    fun getCurrentLocation(call: PluginCall) {
        val locationManager = context.getSystemService(android.content.Context.LOCATION_SERVICE) as? android.location.LocationManager
        if (locationManager == null) {
            call.reject("LocationManager not available")
            return
        }
        try {
            val providers = listOf(
                android.location.LocationManager.GPS_PROVIDER,
                android.location.LocationManager.NETWORK_PROVIDER,
                android.location.LocationManager.PASSIVE_PROVIDER
            )
            var bestLocation: android.location.Location? = null
            for (provider in providers) {
                if (locationManager.isProviderEnabled(provider)) {
                    val loc = locationManager.getLastKnownLocation(provider)
                    if (loc != null && (bestLocation == null || loc.accuracy < bestLocation.accuracy)) {
                        bestLocation = loc
                    }
                }
            }
            if (bestLocation != null) {
                val ret = JSObject()
                ret.put("lat", bestLocation.latitude)
                ret.put("lon", bestLocation.longitude)
                ret.put("accuracy", bestLocation.accuracy.toDouble())
                call.resolve(ret)
            } else {
                call.reject("No location fix available yet")
            }
        } catch (e: SecurityException) {
            call.reject("Location permission not granted: ${e.message}")
        }
    }

    // ── Emergency SOS SMS Dispatch ───────────────────────────────────────

    @PluginMethod
    fun sendSms(call: PluginCall) {
        val number = call.getString("number")
        val text = call.getString("text")

        if (number.isNullOrEmpty()) {
            call.reject("Destination phone number is required")
            return
        }
        if (text.isNullOrEmpty()) {
            call.reject("SMS text content is required")
            return
        }

        // Verify SMS permission
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
            call.reject("SMS permission (Manifest.permission.SEND_SMS) not granted")
            return
        }

        val (success, error) = SmsHelper.sendSms(context, number, text)
        if (success) {
            val ret = JSObject()
            ret.put("success", true)
            ret.put("number", number)
            call.resolve(ret)
        } else {
            call.reject(error ?: "Failed to send SMS")
        }
    }

    // ── Permissions Inspection & Request ─────────────────────────────────

    @PluginMethod
    fun checkMeshPermissions(call: PluginCall) {
        val ret = JSObject()

        val locationGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        val nearbyGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_SCAN
            ) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_ADVERTISE
            ) == PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH
            ) == PackageManager.PERMISSION_GRANTED
        }

        val notificationsGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }

        val smsGranted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.SEND_SMS
        ) == PackageManager.PERMISSION_GRANTED

        ret.put("location", locationGranted)
        ret.put("nearbyDevices", nearbyGranted)
        ret.put("notifications", notificationsGranted)
        ret.put("sms", smsGranted)
        ret.put("allGranted", locationGranted && nearbyGranted && notificationsGranted && smsGranted)

        call.resolve(ret)
    }

    @PluginMethod
    fun requestMeshPermissions(call: PluginCall) {
        val permissionsList = mutableListOf<String>()

        permissionsList.add(Manifest.permission.ACCESS_FINE_LOCATION)
        permissionsList.add(Manifest.permission.ACCESS_COARSE_LOCATION)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissionsList.add(Manifest.permission.BLUETOOTH_SCAN)
            permissionsList.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissionsList.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsList.add(Manifest.permission.POST_NOTIFICATIONS)
            permissionsList.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        }

        permissionsList.add(Manifest.permission.SEND_SMS)

        requestPermissionForAliases(arrayOf("location", "notifications", "sms"), call, "meshPermissionsCallback")
    }

    @PermissionCallback
    private fun meshPermissionsCallback(call: PluginCall) {
        checkMeshPermissions(call)
    }

    // ── MeshEventListener Callbacks (dispatched to JS) ───────────────────

    override fun onPeerFound(endpointId: String, endpointName: String) {
        val data = JSObject().apply {
            put("peerId", endpointId)
            put("name", endpointName)
        }
        notifyListeners("peerFound", data)
    }

    override fun onPeerLost(endpointId: String) {
        val data = JSObject().apply {
            put("peerId", endpointId)
        }
        notifyListeners("peerLost", data)
    }

    override fun onConnected(endpointId: String) {
        val data = JSObject().apply {
            put("peerId", endpointId)
        }
        notifyListeners("connected", data)
    }

    override fun onDisconnected(endpointId: String) {
        val data = JSObject().apply {
            put("peerId", endpointId)
        }
        notifyListeners("disconnected", data)
    }

    override fun onPayloadReceived(endpointId: String, dataBase64: String) {
        val data = JSObject().apply {
            put("peerId", endpointId)
            put("data", dataBase64)
        }
        notifyListeners("receive", data)
    }

    override fun onError(message: String) {
        val data = JSObject().apply {
            put("message", message)
        }
        notifyListeners("meshError", data)
    }
}

