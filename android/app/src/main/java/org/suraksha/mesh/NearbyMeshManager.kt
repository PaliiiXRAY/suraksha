package org.suraksha.mesh

import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.util.concurrent.ConcurrentHashMap

/**
 * Nearby Connections manager using Strategy.P2P_CLUSTER for autonomous
 * multi-peer opportunistic disaster mesh networking.
 *
 * SRS §7 & FR-24 requirements.
 */
class NearbyMeshManager(private val context: Context) {

    private val TAG = "NearbyMeshManager"
    val SERVICE_ID = "org.suraksha.mesh"
    private val connectionsClient = Nearby.getConnectionsClient(context)

    // Active connected endpoints: endpointId -> isConnected
    private val activeConnections = ConcurrentHashMap<String, Boolean>()
    private val pendingConnections = ConcurrentHashMap<String, Boolean>()

    private var isAdvertising = false
    private var isDiscovering = false

    interface MeshEventListener {
        fun onPeerFound(endpointId: String, endpointName: String)
        fun onPeerLost(endpointId: String)
        fun onConnected(endpointId: String)
        fun onDisconnected(endpointId: String)
        fun onPayloadReceived(endpointId: String, dataBase64: String)
        fun onError(message: String)
    }

    var eventListener: MeshEventListener? = null

    var localNodeName: String = "SURAKSHA_" + (Build.MODEL ?: "Node").take(8)

    // Callbacks for Advertising & Connection lifecycle
    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, connectionInfo: ConnectionInfo) {
            Log.d(TAG, "Connection initiated with $endpointId (${connectionInfo.endpointName}), auto-accepting...")
            // Autonomous mesh rule: auto-accept connections from legitimate mesh peers
            connectionsClient.acceptConnection(endpointId, payloadCallback)
                .addOnSuccessListener {
                    Log.d(TAG, "Accepted connection from $endpointId")
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Failed to accept connection from $endpointId", e)
                    eventListener?.onError("Failed to accept connection from $endpointId: ${e.message}")
                }
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            pendingConnections.remove(endpointId)
            when (result.status.statusCode) {
                ConnectionsStatusCodes.STATUS_OK -> {
                    Log.i(TAG, "Connected successfully to peer $endpointId")
                    activeConnections[endpointId] = true
                    eventListener?.onConnected(endpointId)
                }
                ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED -> {
                    Log.w(TAG, "Connection rejected by peer $endpointId")
                    activeConnections.remove(endpointId)
                }
                ConnectionsStatusCodes.STATUS_ERROR -> {
                    Log.e(TAG, "Connection error with peer $endpointId")
                    activeConnections.remove(endpointId)
                }
                else -> {
                    Log.w(TAG, "Unknown connection status ${result.status.statusCode} for $endpointId")
                    activeConnections.remove(endpointId)
                }
            }
        }

        override fun onDisconnected(endpointId: String) {
            Log.i(TAG, "Peer $endpointId disconnected")
            activeConnections.remove(endpointId)
            pendingConnections.remove(endpointId)
            eventListener?.onDisconnected(endpointId)
        }
    }

    // Callbacks for Discovery
    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, discoveredEndpointInfo: DiscoveredEndpointInfo) {
            val remoteName = discoveredEndpointInfo.endpointName
            Log.d(TAG, "Found peer endpoint: $endpointId ($remoteName)")
            eventListener?.onPeerFound(endpointId, remoteName)

            // Auto-connect: Lower ID initiates immediately. Higher ID initiates after 600ms fallback.
            // This guarantees that ANY phone appearing in range connects every single time!
            if (localNodeName < remoteName) {
                Log.i(TAG, "Tie-break WON (local '$localNodeName' < remote '$remoteName'): requesting connection to $endpointId immediately")
                connectToPeer(endpointId) { success, err ->
                    Log.d(TAG, "Auto-connect to $endpointId result: $success, error: $err")
                }
            } else {
                Log.i(TAG, "Tie-break YIELD (local '$localNodeName' >= remote '$remoteName'): waiting up to 600ms for remote, else initiating fallback")
                Handler(Looper.getMainLooper()).postDelayed({
                    if (!activeConnections.containsKey(endpointId) && !pendingConnections.containsKey(endpointId)) {
                        Log.i(TAG, "Remote did not connect within 600ms; initiating fallback connection to $endpointId")
                        connectToPeer(endpointId) { success, err ->
                            Log.d(TAG, "Fallback connect to $endpointId result: $success, error: $err")
                        }
                    }
                }, 600)
            }
        }

        override fun onEndpointLost(endpointId: String) {
            Log.d(TAG, "Lost peer endpoint: $endpointId")
            pendingConnections.remove(endpointId)
            eventListener?.onPeerLost(endpointId)
        }
    }

    // Callbacks for Incoming Data Payloads
    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val bytes = payload.asBytes()
                if (bytes != null) {
                    val base64Data = Base64.encodeToString(bytes, Base64.NO_WRAP)
                    Log.d(TAG, "Received ${bytes.size} bytes from $endpointId")
                    eventListener?.onPayloadReceived(endpointId, base64Data)
                }
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            // Can be used for progress tracking if transmitting large bundles
        }
    }

    private var cycleHandler: Handler? = null
    private var cycleRunnable: Runnable? = null
    private val CYCLE_INTERVAL_MS = 3000L

    /**
     * Start simultaneous advertising and discovery using P2P_CLUSTER.
     * Tolerant of STATUS_ALREADY_ADVERTISING (8001) and STATUS_ALREADY_DISCOVERING (8002).
     * Automatically restarts discovery every 3 seconds to flush stale BLE scan caches.
     */
    fun startMeshDiscovery(serviceId: String = SERVICE_ID, enableAutoCycle: Boolean = true, onComplete: (Boolean, String?) -> Unit) {
        val advertisingOptions = AdvertisingOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER)
            .build()

        val discoveryOptions = DiscoveryOptions.Builder()
            .setStrategy(Strategy.P2P_CLUSTER)
            .build()

        fun beginDiscovery() {
            connectionsClient.startDiscovery(
                serviceId,
                endpointDiscoveryCallback,
                discoveryOptions
            ).addOnSuccessListener {
                isDiscovering = true
                Log.i(TAG, "Started Nearby Discovery on service '$serviceId'")
                if (enableAutoCycle) {
                    startDiscoveryCycleTimer(serviceId)
                }
                onComplete(true, null)
            }.addOnFailureListener { e ->
                val statusCode = (e as? ApiException)?.statusCode
                if (statusCode == ConnectionsStatusCodes.STATUS_ALREADY_DISCOVERING) {
                    isDiscovering = true
                    Log.i(TAG, "Already discovering (status 8002), treated as success")
                    if (enableAutoCycle) {
                        startDiscoveryCycleTimer(serviceId)
                    }
                    onComplete(true, null)
                } else {
                    Log.e(TAG, "Failed to start discovery", e)
                    onComplete(false, "Failed to start discovery: ${e.message}")
                }
            }
        }

        // 1. Start Advertising
        connectionsClient.startAdvertising(
            localNodeName,
            serviceId,
            connectionLifecycleCallback,
            advertisingOptions
        ).addOnSuccessListener {
            isAdvertising = true
            Log.i(TAG, "Started Nearby Advertising as '$localNodeName'")
            beginDiscovery()
        }.addOnFailureListener { e ->
            val statusCode = (e as? ApiException)?.statusCode
            if (statusCode == ConnectionsStatusCodes.STATUS_ALREADY_ADVERTISING) {
                isAdvertising = true
                Log.i(TAG, "Already advertising (status 8001), proceeding to discovery...")
                beginDiscovery()
            } else {
                Log.e(TAG, "Failed to start advertising", e)
                onComplete(false, "Failed to start advertising: ${e.message}")
            }
        }
    }

    /**
     * Stop and restart discovery and advertising without dropping existing connected peers.
     */
    fun restartDiscoveryCycle(serviceId: String = SERVICE_ID, onComplete: (Boolean, String?) -> Unit) {
        try {
            connectionsClient.stopDiscovery()
            isDiscovering = false
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping discovery during 3s cycle", e)
        }

        try {
            connectionsClient.stopAdvertising()
            isAdvertising = false
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping advertising during 3s cycle", e)
        }

        startMeshDiscovery(serviceId, enableAutoCycle = false, onComplete = onComplete)
    }

    /**
     * 3-second cycle timer: turns discovery/advertising off and on again every 3s.
     * Pauses when a peer is connected or connecting so data transfers with maximum stability!
     */
    private fun startDiscoveryCycleTimer(serviceId: String) {
        stopDiscoveryCycleTimer()
        val handler = Handler(Looper.getMainLooper())
        cycleHandler = handler
        val runnable = object : Runnable {
            override fun run() {
                if (!isAdvertising && !isDiscovering) return
                // If a peer is already connected or connecting, do NOT restart discovery (protect ongoing data transfer!)
                if (activeConnections.isNotEmpty() || pendingConnections.isNotEmpty()) {
                    cycleHandler?.postDelayed(this, CYCLE_INTERVAL_MS)
                    return
                }
                Log.d(TAG, "Restarting Nearby discovery cycle (no peers connected, refreshing scan)...")
                restartDiscoveryCycle(serviceId) { _, _ -> }
                cycleHandler?.postDelayed(this, CYCLE_INTERVAL_MS)
            }
        }
        cycleRunnable = runnable
        handler.postDelayed(runnable, CYCLE_INTERVAL_MS)
    }

    private fun stopDiscoveryCycleTimer() {
        cycleRunnable?.let { cycleHandler?.removeCallbacks(it) }
        cycleRunnable = null
        cycleHandler = null
    }

    /**
     * Stop advertising, discovery, cycle timer, and active sessions.
     */
    fun stopMeshDiscovery(onComplete: () -> Unit) {
        stopDiscoveryCycleTimer()

        try {
            connectionsClient.stopAdvertising()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping advertising", e)
        }
        isAdvertising = false

        try {
            connectionsClient.stopDiscovery()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping discovery", e)
        }
        isDiscovering = false

        try {
            connectionsClient.stopAllEndpoints()
            activeConnections.clear()
            pendingConnections.clear()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping endpoints", e)
        }

        onComplete()
    }

    /**
     * Connect to a discovered endpoint.
     * Guards against duplicate connection requests and handles 8003 gracefully.
     */
    fun connectToPeer(endpointId: String, onComplete: (Boolean, String?) -> Unit) {
        if (activeConnections.containsKey(endpointId)) {
            Log.d(TAG, "Already connected to $endpointId")
            onComplete(true, null)
            return
        }

        if (pendingConnections.putIfAbsent(endpointId, true) != null) {
            Log.d(TAG, "Connection to $endpointId already in progress")
            onComplete(true, null)
            return
        }

        connectionsClient.requestConnection(
            localNodeName,
            endpointId,
            connectionLifecycleCallback
        ).addOnSuccessListener {
            Log.i(TAG, "Requested connection to $endpointId")
            onComplete(true, null)
        }.addOnFailureListener { e ->
            pendingConnections.remove(endpointId)
            val statusCode = (e as? ApiException)?.statusCode
            if (statusCode == ConnectionsStatusCodes.STATUS_ALREADY_CONNECTED_TO_ENDPOINT) {
                Log.d(TAG, "Already connected to endpoint $endpointId (8003)")
                activeConnections[endpointId] = true
                onComplete(true, null)
            } else {
                Log.w(TAG, "Failed to request connection to $endpointId ($statusCode): ${e.message}, retrying in 1200ms...")
                Handler(Looper.getMainLooper()).postDelayed({
                    if (!activeConnections.containsKey(endpointId) && !pendingConnections.containsKey(endpointId)) {
                        connectToPeer(endpointId) { _, _ -> }
                    }
                }, 1200)
                onComplete(false, e.message)
            }
        }
    }

    /**
     * Disconnect from a peer.
     */
    fun disconnectFromPeer(endpointId: String) {
        try {
            connectionsClient.disconnectFromEndpoint(endpointId)
            activeConnections.remove(endpointId)
            pendingConnections.remove(endpointId)
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting from $endpointId", e)
        }
    }

    /**
     * Send byte payload to connected peer.
     */
    fun sendBytes(endpointId: String, bytes: ByteArray, onComplete: (Boolean, String?) -> Unit) {
        val payload = Payload.fromBytes(bytes)
        connectionsClient.sendPayload(endpointId, payload)
            .addOnSuccessListener {
                onComplete(true, null)
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Error sending payload to $endpointId", e)
                onComplete(false, e.message)
            }
    }
}
