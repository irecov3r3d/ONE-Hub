// Generate Screen - Main song generation interface
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Voice, { type SpeechErrorEvent, type SpeechResultsEvent } from '@react-native-voice/voice';
import { useStore } from '../../store/useStore';
import { generateSong } from '../../services/api';
import type { Song, GenerateSongRequest } from '../../services/api';

const GENRES = ['Pop', 'Rock', 'Electronic', 'Jazz', 'Classical', 'Hip Hop', 'R&B', 'Country'];
const MOODS = ['Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Dark', 'Uplifting', 'Mysterious'];
const STRATEGIES = [
  { id: 'fastest', name: 'Fastest', time: '~30s', cost: '$0.03' },
  { id: 'best-quality', name: 'Best Quality', time: '~45s', cost: '$0.05' },
  { id: 'ensemble-top3', name: 'Ensemble (Top 3)', time: '~2-3min', cost: '$0.15' },
  { id: 'ensemble-all', name: 'All Models', time: '~3-5min', cost: '$0.20+' },
];

export default function GenerateScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width <= 375;
  const [prompt, setPrompt] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Pop');
  const [selectedMood, setSelectedMood] = useState('Happy');
  const [duration, setDuration] = useState(120); // Default 2 minutes
  const [selectedStrategy, setSelectedStrategy] = useState('ensemble-top3');
  const [isDictating, setIsDictating] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const dictationBasePrompt = useRef('');

  const { isGenerating, generationProgress, setGenerating, setGenerationProgress, addSong, settings } =
    useStore();

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const handleSpeechResults = (event: SpeechResultsEvent) => {
      const transcript = event.value?.[0]?.trim() ?? '';
      const base = dictationBasePrompt.current.trim();
      const combinedPrompt = [base, transcript].filter(Boolean).join(' ');
      setPrompt(combinedPrompt);
    };

    const handleSpeechError = (event: SpeechErrorEvent) => {
      setIsDictating(false);
      setDictationError(event.error?.message ?? 'Dictation failed. Please try again.');
    };

    Voice.onSpeechPartialResults = handleSpeechResults;
    Voice.onSpeechResults = handleSpeechResults;
    Voice.onSpeechEnd = () => setIsDictating(false);
    Voice.onSpeechError = handleSpeechError;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startDictation = async () => {
    if (isDictating) return;
    if (Platform.OS === 'web') {
      Alert.alert('Dictation Unavailable', 'Dictation is only available on iOS or Android.');
      return;
    }

    try {
      setDictationError(null);
      dictationBasePrompt.current = prompt.trim();
      setIsDictating(true);
      await Voice.start('en-US');
    } catch (error) {
      console.error('Failed to start dictation:', error);
      setIsDictating(false);
      Alert.alert('Dictation Unavailable', 'Unable to start iOS dictation right now.');
    }
  };

  const stopDictation = async () => {
    if (!isDictating) return;

    try {
      await Voice.stop();
    } catch (error) {
      console.error('Failed to stop dictation:', error);
    } finally {
      setIsDictating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Missing Prompt', 'Please describe the song you want to create');
      return;
    }

    setGenerating(true);
    setGenerationProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 0.05, 0.95));
      }, 1000);

      const request: GenerateSongRequest = {
        prompt: prompt.trim(),
        genre: selectedGenre,
        mood: selectedMood,
        duration,
        strategy: selectedStrategy as any,
        enableMastering: settings.autoMastering,
      };

      const result = await generateSong(request);

      clearInterval(progressInterval);
      setGenerationProgress(1);

      // Handle comparison mode or regular result
      if ('mode' in result && result.mode === 'comparison') {
        // TODO: Navigate to comparison screen
        Alert.alert('Generation Complete', 'Multiple versions ready for comparison!');
      } else {
        // Add to library
        addSong(result as Song);
        Alert.alert(
          'Success! 🎵',
          `"${result.title}" has been added to your library`,
          [{ text: 'OK' }]
        );
      }

      // Reset form
      setPrompt('');
    } catch (error) {
      console.error('Generation error:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'Failed to generate song'
      );
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isCompact && styles.titleCompact]}>Create Your Song</Text>
        <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
          Describe what you want to hear
        </Text>
      </View>

      {/* Prompt Input */}
      <View style={styles.section}>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>Song Description</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g., upbeat summer pop song about adventure"
            placeholderTextColor="#666"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            maxLength={500}
            editable={!isGenerating}
          />
          <TouchableOpacity
            style={[styles.voiceButton, isDictating && styles.voiceButtonActive]}
            onPress={isDictating ? stopDictation : startDictation}
            disabled={isGenerating}
          >
            <Ionicons
              name={isDictating ? 'stop-circle' : 'mic'}
              size={24}
              color={isDictating ? '#ef4444' : '#8b5cf6'}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.hint, isCompact && styles.hintCompact]}>
          {prompt.length}/500 characters
        </Text>
        <Text style={[styles.dictationHint, isCompact && styles.dictationHintCompact]}>
          {isDictating
            ? 'Listening for dictation…'
            : 'Tap the mic to dictate with iOS speech recognition.'}
        </Text>
        {dictationError ? (
          <Text style={[styles.errorHint, isCompact && styles.errorHintCompact]}>
            {dictationError}
          </Text>
        ) : null}
      </View>

      {/* Genre Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>Genre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {GENRES.map((genre) => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.pill,
                isCompact && styles.pillCompact,
                selectedGenre === genre && styles.pillActive,
              ]}
              onPress={() => setSelectedGenre(genre)}
              disabled={isGenerating}
            >
              <Text
                style={[
                  styles.pillText,
                  isCompact && styles.pillTextCompact,
                  selectedGenre === genre && styles.pillTextActive,
                ]}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>Mood</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pills}>
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.pill,
                isCompact && styles.pillCompact,
                selectedMood === mood && styles.pillActive,
              ]}
              onPress={() => setSelectedMood(mood)}
              disabled={isGenerating}
            >
              <Text
                style={[
                  styles.pillText,
                  isCompact && styles.pillTextCompact,
                  selectedMood === mood && styles.pillTextActive,
                ]}
              >
                {mood}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Duration Slider */}
      <View style={styles.section}>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>
          Duration: {duration}s ({Math.floor(duration / 60)}:
          {(duration % 60).toString().padStart(2, '0')})
        </Text>
        <View style={styles.durationButtons}>
          {[30, 60, 90, 120, 180, 240, 300].map((dur) => (
            <TouchableOpacity
              key={dur}
              style={[
                styles.durationButton,
                isCompact && styles.durationButtonCompact,
                duration === dur && styles.durationButtonActive,
              ]}
              onPress={() => setDuration(dur)}
              disabled={isGenerating}
            >
              <Text
                style={[
                  styles.durationButtonText,
                  isCompact && styles.durationButtonTextCompact,
                  duration === dur && styles.durationButtonTextActive,
                ]}
              >
                {dur >= 60 ? `${dur / 60}m` : `${dur}s`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Strategy Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, isCompact && styles.labelCompact]}>Generation Strategy</Text>
        {STRATEGIES.map((strategy) => (
          <TouchableOpacity
            key={strategy.id}
            style={[
              styles.strategyCard,
              isCompact && styles.strategyCardCompact,
              selectedStrategy === strategy.id && styles.strategyCardActive,
            ]}
            onPress={() => setSelectedStrategy(strategy.id)}
            disabled={isGenerating}
          >
            <View style={styles.strategyInfo}>
              <Text
                style={[
                  styles.strategyName,
                  isCompact && styles.strategyNameCompact,
                  selectedStrategy === strategy.id && styles.strategyNameActive,
                ]}
              >
                {strategy.name}
              </Text>
              <View style={styles.strategyMeta}>
                <Text style={[styles.strategyMetaText, isCompact && styles.strategyMetaTextCompact]}>
                  ⏱️ {strategy.time}
                </Text>
                <Text style={[styles.strategyMetaText, isCompact && styles.strategyMetaTextCompact]}>
                  💰 {strategy.cost}
                </Text>
              </View>
            </View>
            {selectedStrategy === strategy.id && (
              <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          isCompact && styles.generateButtonCompact,
          isGenerating && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <View style={styles.generatingContainer}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={[styles.generateButtonText, isCompact && styles.generateButtonTextCompact]}>
              Generating... {Math.round(generationProgress * 100)}%
            </Text>
          </View>
        ) : (
          <>
            <Ionicons name="sparkles" size={24} color="#fff" />
            <Text style={[styles.generateButtonText, isCompact && styles.generateButtonTextCompact]}>
              Generate Song
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Progress Bar */}
      {isGenerating && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${generationProgress * 100}%` }]} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 26,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  subtitleCompact: {
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  labelCompact: {
    fontSize: 14,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    maxHeight: 150,
    textAlignVertical: 'top',
  },
  voiceButton: {
    padding: 8,
    marginLeft: 8,
  },
  voiceButtonActive: {
    backgroundColor: '#ef444420',
    borderRadius: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  hintCompact: {
    fontSize: 11,
  },
  dictationHint: {
    fontSize: 12,
    color: '#8b5cf6',
    marginTop: 6,
  },
  dictationHintCompact: {
    fontSize: 11,
  },
  errorHint: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 6,
  },
  errorHintCompact: {
    fontSize: 11,
  },
  pills: {
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  pillCompact: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  pillText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  pillTextCompact: {
    fontSize: 12,
  },
  pillTextActive: {
    color: '#fff',
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  durationButtonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  durationButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  durationButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  durationButtonTextCompact: {
    fontSize: 12,
  },
  durationButtonTextActive: {
    color: '#fff',
  },
  strategyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  strategyCardCompact: {
    padding: 12,
  },
  strategyCardActive: {
    borderColor: '#8b5cf6',
    backgroundColor: '#8b5cf620',
  },
  strategyInfo: {
    flex: 1,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  strategyNameCompact: {
    fontSize: 14,
  },
  strategyNameActive: {
    color: '#8b5cf6',
  },
  strategyMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  strategyMetaText: {
    fontSize: 12,
    color: '#999',
  },
  strategyMetaTextCompact: {
    fontSize: 11,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  generateButtonCompact: {
    paddingVertical: 14,
  },
  generateButtonDisabled: {
    backgroundColor: '#666',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  generateButtonTextCompact: {
    fontSize: 16,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
});
