package com.safetyapp;

import java.util.HashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;

/**
 * Android implementation of FeatureExtractor.py
 * Extracts 17 features:
 * - 3 Keyword Features
 * - 5 Text/Sentiment Features
 * - 6 Audio Features
 * - 3 Baseline Comparison Features
 */
public class FeatureExtractor {

    // --- 1. Text Analysis Data ---
    private Set<String> negativeWords;
    private Set<String> positiveWords;
    private Map<String, Set<String>> emotionKeywords;
    private Set<String> criticalKeywords;

    // --- State ---
    private float[] currentFeatures = new float[17];
    private StringBuilder transcriptBuffer = new StringBuilder();
    
    // Default baseline for comparison (can be updated)
    private float baselinePitch = 200f;
    private float baselineEnergy = 60f;
    
    // Scaler Mean and Std (Default to Identity)
    private float[] scalerMean = new float[17];
    private float[] scalerStd = new float[17];

    public FeatureExtractor() {
        initializeDictionaries();
        // Init scales to 1 to avoid division by zero
        Arrays.fill(scalerStd, 1.0f);
    }
    
    public void setScalerParams(float[] mean, float[] std) {
        if (mean != null && std != null && mean.length == 17 && std.length == 17) {
            this.scalerMean = mean;
            this.scalerStd = std;
        }
    }

    private void initializeDictionaries() {
        // 1. Negative Words
        negativeWords = new HashSet<>(Arrays.asList(
            "scared", "afraid", "terrified", "frightened", "fearful", "fear",
            "help", "please", "stop", "crying", "cry", "tears",
            "hurt", "hurting", "pain", "painful", "ache",
            "angry", "mad", "furious", "rage", "hate",
            "sad", "depressed", "miserable", "unhappy", "upset",
            "attack", "attacking", "danger", "dangerous", "threat",
            "emergency", "urgent", "critical", "serious",
            "no", "dont", "never", "cant",
            "wrong", "bad", "terrible", "awful", "horrible",
            "alone", "lonely", "abandoned", "lost",
            "screaming", "yelling", "shouting"
        ));

        // 2. Positive Words
        positiveWords = new HashSet<>(Arrays.asList(
            "happy", "joy", "joyful", "excited", "great",
            "good", "wonderful", "amazing", "excellent", "fantastic",
            "love", "loving", "loved", "glad", "pleased",
            "fine", "okay", "alright", "safe", "secure",
            "calm", "peaceful", "relaxed", "comfortable",
            "smile", "smiling", "laugh", "laughing", "fun"
        ));
        
        // 3. Critical Keywords
        criticalKeywords = new HashSet<>(Arrays.asList(
            "help", "rape", "murder", "kill", "police", "call", "emergency", "save", "dying"
        ));

        // 4. Emotions
        emotionKeywords = new HashMap<>();
        emotionKeywords.put("fear", new HashSet<>(Arrays.asList(
            "scared", "afraid", "terrified", "frightened", "fearful", "fear",
            "nervous", "anxious", "worried", "panic", "panicking",
            "threat", "danger", "dangerous", "threatening"
        )));
        emotionKeywords.put("anger", new HashSet<>(Arrays.asList(
            "angry", "mad", "furious", "rage", "hate", "hating",
            "annoyed", "irritated", "frustrated", "infuriated",
            "stop", "enough", "leave"
        )));
    }

    /**
     * Update Audio Features [Indices 8-13 and 14-16]
     */
    /**
     * Update Audio Features [Indices 8-13 and 14-16]
     */
    public void updateAudioFeatures(float pitchMean, float pitchStd, float energyMean, float energyStd, float zcr, float tempo) {
        currentFeatures[8] = pitchMean;
        currentFeatures[9] = pitchStd;
        currentFeatures[10] = energyMean;
        currentFeatures[11] = energyStd;
        currentFeatures[12] = zcr;
        // Use default tempo (125 based on scaler mean) if 0 to avoid outlier
        currentFeatures[13] = (tempo > 0) ? tempo : 125.0f;

        // Baseline changes
        // CRITICAL FIX: User's training data has 0 variance for baseline (Mean=0, Scale=1).
        // Calculating actual difference (e.g. 200) results in massive outlier (200 sigma).
        // We MUST force these to 0 to match training distribution.
        currentFeatures[14] = 0.0f; 
        currentFeatures[15] = 0.0f;
        currentFeatures[16] = 0.0f;
    }

    /**
     * Process Text and Update Text Features [Indices 0-7]
     */
    public void processText(String text) {
        if (text == null || text.isEmpty()) return;
        
        String lowerText = text.toLowerCase();
        String[] words = lowerText.split("\\W+"); 
        
        // --- 1. Keywords ---
        boolean hasKeywords = false;
        boolean isCritical = false;
        float keywordThreat = 0;
        
        for (String w : words) {
            if (negativeWords.contains(w)) {
                hasKeywords = true;
                keywordThreat += 10;
            }
            if (criticalKeywords.contains(w)) {
                isCritical = true;
                keywordThreat += 50;
            }
        }
        keywordThreat = Math.min(keywordThreat, 100);

        currentFeatures[0] = hasKeywords ? 1.0f : 0.0f;
        currentFeatures[1] = keywordThreat;
        currentFeatures[2] = isCritical ? 1.0f : 0.0f;

        // --- 2. Sentiment ---
        int negCount = 0;
        int posCount = 0;
        for (String w : words) {
            if (negativeWords.contains(w)) negCount++;
            if (positiveWords.contains(w)) posCount++;
        }
        
        boolean isNegative = negCount > posCount;
        float sentimentScore = 50;
        if (negCount + posCount > 0) {
            float ratio = (float) negCount / (negCount + posCount);
            sentimentScore = 50 + (ratio * 50); 
        }

        currentFeatures[3] = isNegative ? 1.0f : 0.0f;
        currentFeatures[4] = sentimentScore;

        // --- 3. Emotions ---
        Map<String, Float> emotionScores = new HashMap<>();
        for (Map.Entry<String, Set<String>> entry : emotionKeywords.entrySet()) {
            String emotion = entry.getKey();
            Set<String> keywords = entry.getValue();
            int count = 0;
            for (String w : words) {
                if (keywords.contains(w)) count++;
            }
            emotionScores.put(emotion, (float)count * 20); 
        }
        
        float maxEmoScore = 0;
        for (float s : emotionScores.values()) {
            if (s > maxEmoScore) maxEmoScore = s;
        }
        currentFeatures[5] = Math.min(maxEmoScore, 100); 

        float fearScore = emotionScores.getOrDefault("fear", 0f);
        float angerScore = emotionScores.getOrDefault("anger", 0f);
        
        float stressScore = (fearScore * 0.4f) + (angerScore * 0.3f) + (sentimentScore > 60 ? 20 : 0);

        currentFeatures[6] = Math.min(stressScore, 100);
        currentFeatures[7] = Math.min(fearScore, 100);
    }
    
    public float[] getFeatureVector() {
        // Return Normalized Vector
        float[] normalized = new float[17];
        for (int i = 0; i < 17; i++) {
            normalized[i] = (currentFeatures[i] - scalerMean[i]) / scalerStd[i];
        }
        return normalized;
    }
}
