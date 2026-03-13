// Comparison Screen - Swipe through and compare multiple AI generations
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import type { GenerationResult } from '../services/api';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

export default function ComparisonScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  // Parse comparison data from params
  const generations: GenerationResult[] = params.generations
    ? JSON.parse(params.generations as string)
    : [];
  const bestGenerationId = params.bestGeneration as string;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    loadCurrentSound();
  }, [currentIndex]);

  const loadCurrentSound = async () => {
    try {
      // Unload previous sound
      if (sound) {
        await sound.unloadAsync();
      }

      const currentGeneration = generations[currentIndex];
      if (!currentGeneration) return;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentGeneration.audioUrl },
        { shouldPlay: false }
      );

      setSound(newSound);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
        // Scale down slightly while swiping
        const scaleValue = 1 - Math.abs(gesture.dx) / width * 0.1;
        scale.setValue(scaleValue);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD && currentIndex > 0) {
          // Swipe right - previous generation
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD && currentIndex < generations.length - 1) {
          // Swipe left - next generation
          swipeLeft();
        } else {
          // Reset position
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -width, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(currentIndex + 1);
      position.setValue({ x: 0, y: 0 });
      scale.setValue(1);
    });
  };

  const swipeRight = () => {
    Animated.timing(position, {
      toValue: { x: width, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setCurrentIndex(currentIndex - 1);
      position.setValue({ x: 0, y: 0 });
      scale.setValue(1);
    });
  };

  const toggleFavorite = () => {
    const currentGeneration = generations[currentIndex];
    const newFavorites = new Set(favorites);

    if (favorites.has(currentGeneration.id)) {
      newFavorites.delete(currentGeneration.id);
    } else {
      newFavorites.add(currentGeneration.id);
    }

    setFavorites(newFavorites);
  };

  const handleSelectGeneration = () => {
    const selected = generations[currentIndex];
    Alert.alert(
      'Save Generation',
      `Save this version to your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            // TODO: Save to library
            router.back();
          },
        },
      ]
    );
  };

  if (generations.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#999" />
        <Text style={styles.errorText}>No generations to compare</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentGeneration = generations[currentIndex];
  const isBest = currentGeneration.id === bestGenerationId;
  const isFavorite = favorites.has(currentGeneration.id);

  const cardStyle = {
    transform: [
      ...position.getTranslateTransform(),
      { scale },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compare Generations</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {generations.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index === currentIndex && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {/* Swipeable Card */}
      <Animated.View
        style={[styles.cardContainer, cardStyle]}
        {...panResponder.panHandlers}
      >
        <View style={styles.card}>
          {/* Best Badge */}
          {isBest && (
            <View style={styles.bestBadge}>
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={styles.bestBadgeText}>AI Recommended</Text>
            </View>
          )}

          {/* Artwork */}
          <View style={styles.artwork}>
            <Ionicons name="musical-notes" size={80} color="#8b5cf6" />
          </View>

          {/* Model Info */}
          <View style={styles.modelInfo}>
            <Text style={styles.modelName}>{currentGeneration.modelName}</Text>
            <Text style={styles.modelMeta}>
              Generated in {currentGeneration.generationTime.toFixed(1)}s • ${currentGeneration.cost.toFixed(3)}
            </Text>
          </View>

          {/* Quality Metrics */}
          <View style={styles.metrics}>
            <View style={styles.metricRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Overall Score</Text>
                <View style={styles.metricBar}>
                  <View
                    style={[
                      styles.metricBarFill,
                      { width: `${currentGeneration.metrics.overallScore * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.metricValue}>
                  {Math.round(currentGeneration.metrics.overallScore * 100)}%
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricSmall}>
                <Text style={styles.metricLabel}>Clarity</Text>
                <Text style={styles.metricValue}>
                  {Math.round(currentGeneration.metrics.spectralClarity * 100)}%
                </Text>
              </View>
              <View style={styles.metricSmall}>
                <Text style={styles.metricLabel}>Dynamic Range</Text>
                <Text style={styles.metricValue}>
                  {currentGeneration.metrics.dynamicRange.toFixed(1)}dB
                </Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={styles.metricSmall}>
                <Text style={styles.metricLabel}>Stereo Width</Text>
                <Text style={styles.metricValue}>
                  {Math.round(currentGeneration.metrics.stereoWidth * 100)}%
                </Text>
              </View>
              <View style={styles.metricSmall}>
                <Text style={styles.metricLabel}>Prompt Match</Text>
                <Text style={styles.metricValue}>
                  {Math.round(currentGeneration.metrics.promptAdherence * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Play Button */}
          <TouchableOpacity style={styles.playButton} onPress={togglePlayPause}>
            <Ionicons
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={80}
              color="#8b5cf6"
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Navigation Hints */}
      <View style={styles.hints}>
        {currentIndex > 0 && (
          <View style={styles.hintLeft}>
            <Ionicons name="chevron-back" size={24} color="#666" />
            <Text style={styles.hintText}>Previous</Text>
          </View>
        )}
        {currentIndex < generations.length - 1 && (
          <View style={styles.hintRight}>
            <Text style={styles.hintText}>Next</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleFavorite}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={28}
            color={isFavorite ? '#ef4444' : '#fff'}
          />
          <Text style={styles.actionText}>Favorite</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={handleSelectGeneration}
        >
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
          <Text style={styles.actionTextPrimary}>Select This</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={28} color="#fff" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Counter */}
      <Text style={styles.counter}>
        {currentIndex + 1} / {generations.length}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  progressDotActive: {
    backgroundColor: '#8b5cf6',
    width: 24,
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: width - 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  bestBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  bestBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  modelInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  modelMeta: {
    fontSize: 12,
    color: '#999',
  },
  metrics: {
    marginBottom: 24,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
  },
  metricSmall: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  metricBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  metricBarFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  playButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  hintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hintText: {
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  actionButton: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  actionText: {
    fontSize: 12,
    color: '#999',
  },
  actionTextPrimary: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  counter: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
