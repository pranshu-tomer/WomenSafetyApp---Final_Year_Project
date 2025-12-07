package com.safetyapp

import android.media.AudioFormat
import android.media.AudioRecord
import be.tarsos.dsp.io.TarsosDSPAudioFormat
import be.tarsos.dsp.io.TarsosDSPAudioInputStream
import java.io.IOException

class AndroidAudioInputStream(private val audioRecord: AudioRecord, private val format: TarsosDSPAudioFormat) : TarsosDSPAudioInputStream {

    override fun skip(bytesToSkip: Long): Long {
        throw IOException("Can not skip in audio stream")
    }

    override fun read(b: ByteArray, off: Int, len: Int): Int {
        return audioRecord.read(b, off, len)
    }

    override fun close() {
        audioRecord.stop()
        audioRecord.release()
    }

    override fun getFormat(): TarsosDSPAudioFormat {
        return format
    }

    override fun getFrameLength(): Long {
        return -1
    }
}
