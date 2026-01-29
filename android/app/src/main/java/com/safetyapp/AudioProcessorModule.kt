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
import be.tarsos.dsp.io.TarsosDSPAudioFormat

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.content.res.AssetManager
import android.util.Log

// Vosk
import org.vosk.Model
import org.vosk.Recognizer
import org.vosk.android.StorageService

// TFLite
import org.tensorflow.lite.Interpreter
import java.io.FileInputStream
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import java.io.IOException

import org.json.JSONObject

class AudioProcessorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var dispatcher: AudioDispatcher? = null
    private var processingThread: Thread? = null
    private var isListening = false
    private var audioRecord: AudioRecord? = null
    
    // AI Components
    private var voskRecognizer: Recognizer? = null
    private var tfliteInterpreter: Interpreter? = null
    private var featureExtractor: FeatureExtractor? = null
    
    private var lastDetectedPitch: Float = -1f // Shared variable for pitch
     
    private var emergencyNumber: String? = null
    private var lastCallTime: Long = 0

    override fun getName(): String {
        return "AudioProcessor"
    }

    // Load TFLite Model from Assets
    private fun loadModelFile(modelPath: String): MappedByteBuffer {
        val fileDescriptor = reactApplicationContext.assets.openFd(modelPath)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    @ReactMethod
    fun startListening(phoneNumber: String, promise: Promise) {
        if (isListening) {
            promise.resolve("Already listening")
            return
        }
        
        this.emergencyNumber = phoneNumber
        this.featureExtractor = FeatureExtractor()

        try {
            // 1. Initialize TFLite
            try {
                val tfliteModel = loadModelFile("safety_model.tflite")
                tfliteInterpreter = Interpreter(tfliteModel)
                Log.d("SafetyApp", "✅ TFLite Model Loaded")
            } catch (e: Exception) {
                Log.e("SafetyApp", "❌ TFLite Load Failed (Make sure safety_model.tflite is in assets)", e)
            }

            // 2. Initialize Vosk
            // org.vosk.LibVosk.setLogLevel(0) // Removed to avoid type error
            val assetManager = reactApplicationContext.assets
            val modelPath = copyAssetsToStorage("vosk-model")
            if (modelPath != null) {
                val model = Model(modelPath)
                voskRecognizer = Recognizer(model, 22050.0f)
                Log.d("SafetyApp", "✅ Vosk Model Loaded")
            } else {
                Log.e("SafetyApp", "❌ Vosk Model Path Not Found")
            }
            
            // 3. Load Scaler Params (Crucial for correct prediction)
            loadScalerParams()

            // 4. Audio Setup
            val sampleRate = 22050
            val bufferSize = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
            val bufferSizeCalc = maxOf(bufferSize, 4096)

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

            // --- Pitch Processor ---
            val pitchHandler = PitchDetectionHandler { result, _ ->
                val pitch = result.pitch
                if (pitch != -1f) {
                    lastDetectedPitch = pitch // Update shared variable
                    sendEvent("onPitchDetected", Arguments.createMap().apply {
                        putDouble("pitch", pitch.toDouble())
                    })
                }
            }
            dispatcher?.addAudioProcessor(PitchProcessor(PitchEstimationAlgorithm.YIN, sampleRate.toFloat(), bufferSizeCalc, pitchHandler))

            // --- Main Feature & Prediction Loop ---
            dispatcher?.addAudioProcessor(object : AudioProcessor {
                private var frameCount = 0
                
                // Rolling stats
                private var pitchSum = 0f
                private var pitchCount = 0
                private var energySum = 0f
                
                override fun process(audioEvent: AudioEvent): Boolean {
                    // 1. Audio Features
                    val pitch = if (lastDetectedPitch != -1f) lastDetectedPitch else 0f
                    // FIX: Remove * 100. Scaler expects 0.0-1.0 range (mean ~0.08).
                    val rms = audioEvent.getRMS() 
                    
                    val buffer = audioEvent.floatBuffer
                    var zcr = 0
                    for (i in 0 until buffer.size - 1) {
                        if (buffer[i] * buffer[i + 1] < 0) zcr++
                    }
                    val zcrMean = zcr.toFloat() / buffer.size
                    
                    // Simple Silence Detection to reduce false positives
                    if (rms < 0.005) {
                        // Silence: Skip inference or update with "Silence"
                        // But we still update extractor to decay text features?
                        // For now, let's just NOT trigger inference on silence.
                        return true
                    }

                    // Update Extractor
                    featureExtractor?.updateAudioFeatures(
                        pitch, 0f, 
                        rms.toFloat(), 0f, 
                        zcrMean, 0f 
                    )

                    // 2. Speech-to-Text (Vosk)
                    val byteBuffer = audioEvent.byteBuffer
                    if (voskRecognizer != null) {
                        if (voskRecognizer!!.acceptWaveForm(byteBuffer, byteBuffer.size)) {
                            val result = voskRecognizer!!.result
                            val text = parseVoskResult(result)
                            if (text.isNotEmpty()) {
                                Log.d("SafetyApp", "🗣️ Text: $text")
                                featureExtractor?.processText(text)
                            }
                        }
                    }

                    // 3. Inference (Every ~0.5 seconds or so)
                    frameCount++
                    if (frameCount % 10 == 0 && tfliteInterpreter != null) {
                        val input = featureExtractor?.featureVector
                        if (input != null) {
                            // DEBUG: Print normalized vector roughly
                            val debugVec = "Audio [P:${input[8]}, E:${input[10]}, Z:${input[12]}]"
                            // Log.d("SafetyApp", "Features: $debugVec")

                            val output = Array(1) { FloatArray(1) }
                            tfliteInterpreter!!.run(input, output)
                            
                            val prediction = output[0][0]
                            Log.d("SafetyApp", "🤖 Prediction: $prediction | RawRMS: $rms")
                            
                            if (prediction > 0.5) { // Threshold
                                Log.e("SafetyApp", "🚨 DANGER DETECTED! Score: $prediction")
                                triggerEmergencyCall()
                            }
                        }
                    }

                    return true
                }

                override fun processingFinished() {}
            })

            processingThread = Thread(dispatcher, "Audio Dispatcher")
            processingThread?.start()
            isListening = true
            
            // FG Service
            val serviceIntent = android.content.Intent(reactApplicationContext, SafetyService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }

            promise.resolve("Started listening with AI")

        } catch (e: Exception) {
            Log.e("SafetyApp", "Start Failed", e)
            promise.reject("START_FAILED", e.message)
        }
    }
    
    // Helper to parse Vosk JSON
    private fun parseVoskResult(json: String): String {
        try {
            val obj = JSONObject(json)
            return obj.optString("text", "")
        } catch (e: Exception) {
            return ""
        }
    }

    // Helper: Copy asset folder to internal storage for Vosk
    private fun copyAssetsToStorage(assetName: String): String? {
        val destDir = java.io.File(reactApplicationContext.filesDir, assetName)
        if (!destDir.exists()) destDir.mkdirs()
        // Simple recursive copy or just assume flat for model? 
        // Vosk structure is complex. Better use a library or just copy.
        // For standard "vosk-model-small-en-us", it has subdirs.
        // We will do a simplified non-recursive copy for the root files? No, need all.
        // Minimalist implementation:
        try {
            copyAssetFolder(reactApplicationContext.assets, assetName, destDir.absolutePath)
            return destDir.absolutePath
        } catch (e: Exception) {
            Log.e("SafetyApp", "Asset Copy Failed", e)
            return null
        }
    }

    private fun copyAssetFolder(assetManager: AssetManager, fromAssetPath: String, toPath: String) {
        val files = assetManager.list(fromAssetPath) ?: return
        if (files.isEmpty()) {
            // It's a file
            copyAsset(assetManager, fromAssetPath, toPath)
        } else {
            // It's a directory
            java.io.File(toPath).mkdirs()
            for (file in files) {
                copyAssetFolder(assetManager, "$fromAssetPath/$file", "$toPath/$file")
            }
        }
    }

    private fun copyAsset(assetManager: AssetManager, fromAssetPath: String, toPath: String) {
        val input = assetManager.open(fromAssetPath)
        val output = java.io.FileOutputStream(toPath)
        input.use { inp ->
            output.use { main ->
                inp.copyTo(main)
            }
        }
    }


    private fun triggerEmergencyCall() {
        Log.d("SafetyApp", "Attempting to trigger emergency call")
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastCallTime < 5000) return 

        emergencyNumber?.let { number ->
            lastCallTime = currentTime
            try {
                val intent = android.content.Intent(android.content.Intent.ACTION_CALL)
                intent.data = android.net.Uri.parse("tel:$number")
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
            } catch (e: Exception) {
                Log.e("SafetyApp", "Call Failed", e)
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
            processingThread?.join()
            if (audioRecord?.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                audioRecord?.stop()
                audioRecord?.release()
            }
            voskRecognizer?.close()
            tfliteInterpreter?.close()

            isListening = false
            dispatcher = null
            processingThread = null
            audioRecord = null
            
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

    private fun loadScalerParams() {
        try {
            val inputStream = reactApplicationContext.assets.open("scaler_params.json")
            val size = inputStream.available()
            val buffer = ByteArray(size)
            inputStream.read(buffer)
            inputStream.close()
            val jsonStr = String(buffer, java.nio.charset.Charset.forName("UTF-8"))
            val json = JSONObject(jsonStr)

            val meanJson = json.getJSONArray("mean")
            val scaleJson = json.getJSONArray("scale")

            val meanProps = FloatArray(17)
            val scaleProps = FloatArray(17)

            if (meanJson.length() == 17 && scaleJson.length() == 17) {
                for (i in 0 until 17) {
                    meanProps[i] = meanJson.getDouble(i).toFloat()
                    scaleProps[i] = scaleJson.getDouble(i).toFloat()
                }
                featureExtractor?.setScalerParams(meanProps, scaleProps)
                Log.d("SafetyApp", "✅ Scaler Params Loaded")
            } else {
                Log.e("SafetyApp", "❌ Invalid Scaler Params Length")
            }
        } catch (e: Exception) {
            Log.e("SafetyApp", "❌ Failed to load scaler params", e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
