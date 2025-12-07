package com.safetyapp

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

import be.tarsos.dsp.AudioDispatcher
import be.tarsos.dsp.AudioEvent
import be.tarsos.dsp.AudioProcessor
import be.tarsos.dsp.pitch.PitchDetectionHandler
import be.tarsos.dsp.pitch.PitchProcessor
import be.tarsos.dsp.pitch.PitchProcessor.PitchEstimationAlgorithm
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import be.tarsos.dsp.io.TarsosDSPAudioFormat

class AudioProcessorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var dispatcher: AudioDispatcher? = null
    private var processingThread: Thread? = null
    private var isListening = false
    private var audioRecord: AudioRecord? = null

    override fun getName(): String {
        return "AudioProcessor"
    }

    private var emergencyNumber: String? = null
    private var lastCallTime: Long = 0

    @ReactMethod
    fun startListening(phoneNumber: String, promise: Promise) {
        if (isListening) {
            promise.resolve("Already listening")
            return
        }
        
        this.emergencyNumber = phoneNumber

        try {
            val sampleRate = 22050
            val bufferSize = AudioRecord.getMinBufferSize(
                sampleRate, 
                AudioFormat.CHANNEL_IN_MONO, 
                AudioFormat.ENCODING_PCM_16BIT
            )
            
            val bufferSizeCalc = maxOf(bufferSize, 1024)

            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC, 
                sampleRate, 
                AudioFormat.CHANNEL_IN_MONO, 
                AudioFormat.ENCODING_PCM_16BIT, 
                bufferSizeCalc
            )

            val format = TarsosDSPAudioFormat(sampleRate.toFloat(), 16, 1, true, false)
            val audioStream = AndroidAudioInputStream(audioRecord!!, format)
            
            audioRecord?.startRecording()
            
            dispatcher = AudioDispatcher(audioStream, bufferSizeCalc, 0)

            // Pitch detection
            val pitchHandler = PitchDetectionHandler { result, _ ->
                val pitch = result.pitch
                if (pitch != -1f) {
                    sendEvent("onPitchDetected", Arguments.createMap().apply {
                        putDouble("pitch", pitch.toDouble())
                    })
                    
                    // Native Threat Detection (Screaming)
                    if (pitch > 500) {
                        android.util.Log.d("SafetyApp", "High Pitch Detected: $pitch")
                        triggerEmergencyCall()
                    }
                }
            }
            
            val pitchProcessor = PitchProcessor(
                PitchEstimationAlgorithm.YIN, 
                sampleRate.toFloat(), 
                bufferSizeCalc, 
                pitchHandler
            )
            dispatcher?.addAudioProcessor(pitchProcessor)

            // Audio feature extraction (Energy/RMS)
            dispatcher?.addAudioProcessor(object : AudioProcessor {
                override fun process(audioEvent: AudioEvent): Boolean {
                    val rms = audioEvent.getRMS() * 100 // Scale up
                    // android.util.Log.d("SafetyApp", "RMS: $rms") // Too noisy
                    
                    // Native Threat Detection (Loud Noise)
                    if (rms > 80) {
                         android.util.Log.d("SafetyApp", "High Energy Detected: $rms")
                        // triggerEmergencyCall() // Optional: Enable if energy alone is enough
                    }
                    return true
                }

                override fun processingFinished() {}
            })

            processingThread = Thread(dispatcher, "Audio Dispatcher")
            processingThread?.start()
            isListening = true
            
            // Start Foreground Service
            val serviceIntent = android.content.Intent(reactApplicationContext, SafetyService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }

            promise.resolve("Started listening")

        } catch (e: Exception) {
            android.util.Log.e("SafetyApp", "Start Failed", e)
            promise.reject("START_FAILED", e.message)
        }
    }

    private fun triggerEmergencyCall() {
        android.util.Log.d("SafetyApp", "Attempting to trigger emergency call")
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastCallTime < 3000) { // Reduced to 3 seconds for testing
             android.util.Log.d("SafetyApp", "Call debounced")
             return 
        }

        emergencyNumber?.let { number ->
            lastCallTime = currentTime
            try {
                android.util.Log.d("SafetyApp", "Calling number: $number")
                val intent = android.content.Intent(android.content.Intent.ACTION_CALL)
                intent.data = android.net.Uri.parse("tel:$number")
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                android.util.Log.d("SafetyApp", "Call intent started")
            } catch (e: Exception) {
                android.util.Log.e("SafetyApp", "Call Failed", e)
                e.printStackTrace()
            }
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        if (!isListening) {
            promise.resolve("Not listening")
            return
        }

        try {
            dispatcher?.stop()
            processingThread?.join() // Wait for thread to finish
            
            // AudioRecord is stopped in AndroidAudioInputStream.close() which is called by dispatcher.stop()
            // But just in case:
            if (audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord?.stop()
                audioRecord?.release()
            }
            
            isListening = false
            dispatcher = null
            processingThread = null
            audioRecord = null
            
            // Stop Foreground Service
            val serviceIntent = android.content.Intent(reactApplicationContext, SafetyService::class.java)
            reactApplicationContext.stopService(serviceIntent)

            promise.resolve("Stopped listening")
        } catch (e: Exception) {
            promise.reject("STOP_FAILED", e.message)
        }
    }

    @ReactMethod
    fun makeDirectCall(phoneNumber: String, promise: Promise) {
        try {
            val intent = android.content.Intent(android.content.Intent.ACTION_CALL)
            intent.data = android.net.Uri.parse("tel:$phoneNumber")
            intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CALL_FAILED", e.message)
        }
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            if (!android.provider.Settings.canDrawOverlays(reactApplicationContext)) {
                val intent = android.content.Intent(
                    android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + reactApplicationContext.packageName)
                )
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                promise.resolve(false)
            } else {
                promise.resolve(true)
            }
        } else {
            promise.resolve(true)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
