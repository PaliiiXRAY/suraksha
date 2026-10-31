package org.suraksha.mesh

import android.content.Context
import android.os.Build
import android.telephony.SmsManager
import android.util.Log

/**
 * Emergency SOS SMS dispatch fallback.
 *
 * SRS §7, FR-27, and Appendix A.3:
 * Sends compact short format e.g. "SOS <sos_id> <lat>,<lon> <unix_time> <people>".
 */
object SmsHelper {
    private const val TAG = "SmsHelper"

    fun sendSms(context: Context, destinationNumber: String, messageText: String): Pair<Boolean, String?> {
        return try {
            val smsManager: SmsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                context.getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }

            if (messageText.length > 160) {
                val parts = smsManager.divideMessage(messageText)
                smsManager.sendMultipartTextMessage(destinationNumber, null, parts, null, null)
                Log.i(TAG, "Sent multipart SMS (${parts.size} parts) to $destinationNumber")
            } else {
                smsManager.sendTextMessage(destinationNumber, null, messageText, null, null)
                Log.i(TAG, "Sent SMS to $destinationNumber")
            }
            Pair(true, null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send SMS to $destinationNumber", e)
            Pair(false, e.message ?: "Failed to send SMS")
        }
    }
}

