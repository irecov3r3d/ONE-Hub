// Library Screen - View and manage all generated songs
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import AudioPlayer from '../../components/AudioPlayer';
import type { Song } from '../../services/api';

export default function LibraryScreen() {
  const { songs, currentSong, setCurrentSong, removeSong, loadSongs } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'genre'>('recent');
  const [filterGenre, setFilterGenre] = useState<string | null>(null);

  useEffect(() => {
    loadSongs();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    loadSongs();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handlePlaySong = (song: Song) => {
    setCurrentSong(song);
    setShowPlayer(true);
  };

  const handleDeleteSong = (song: Song) => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${song.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeSong(song.id);
            if (currentSong?.id === song.id) {
              setCurrentSong(null);
              setShowPlayer(false);
            }
          },
        },
      ]
    );
  };

  const getSortedSongs = () => {
    let filtered = filterGenre
      ? songs.filter((s) => s.genre === filterGenre)
      : [...songs];

    switch (sortBy) {
      case 'recent':
        return filtered.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'title':
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case 'genre':
        return filtered.sort((a, b) => a.genre.localeCompare(b.genre));
      default:
        return filtered;
    }
  };

  const getUniqueGenres = () => {
    return Array.from(new Set(songs.map((s) => s.genre)));
  };

  const renderSongCard = ({ item: song }: { item: Song }) => (
    <TouchableOpacity
      style={styles.songCard}
      onPress={() => handlePlaySong(song)}
      activeOpacity={0.7}
    >
      {/* Artwork */}
      <View style={styles.songArtwork}>
        <Ionicons name="musical-notes" size={32} color="#8b5cf6" />
      </View>

      {/* Song Info */}
      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.songMeta} numberOfLines={1}>
          {song.genre} • {song.mood}
        </Text>
        <Text style={styles.songDuration}>{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</Text>
      </View>

      {/* Actions */}
      <View style={styles.songActions}>
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={() => handlePlaySong(song)}
        >
          <Ionicons name="play-circle" size={32} color="#8b5cf6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionIcon}
          onPress={() => handleDeleteSong(song)}
        >
          <Ionicons name="trash-outline" size={20} color="#999" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={80} color="#333" />
      <Text style={styles.emptyTitle}>No Songs Yet</Text>
      <Text style={styles.emptySubtitle}>
        Generate your first song in the Create tab
      </Text>
    </View>
  );

  const sortedSongs = getSortedSongs();
  const genres = getUniqueGenres();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Library</Text>
        <Text style={styles.subtitle}>{songs.length} songs</Text>
      </View>

      {/* Filters */}
      {songs.length > 0 && (
        <View style={styles.filters}>
          {/* Genre Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filter by Genre:</Text>
            <View style={styles.filterPills}>
              <TouchableOpacity
                style={[styles.filterPill, !filterGenre && styles.filterPillActive]}
                onPress={() => setFilterGenre(null)}
              >
                <Text style={[styles.filterPillText, !filterGenre && styles.filterPillTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {genres.map((genre) => (
                <TouchableOpacity
                  key={genre}
                  style={[styles.filterPill, filterGenre === genre && styles.filterPillActive]}
                  onPress={() => setFilterGenre(genre)}
                >
                  <Text style={[styles.filterPillText, filterGenre === genre && styles.filterPillTextActive]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort Options */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort by:</Text>
            <View style={styles.sortButtons}>
              {[
                { id: 'recent', label: 'Recent', icon: 'time-outline' },
                { id: 'title', label: 'Title', icon: 'text-outline' },
                { id: 'genre', label: 'Genre', icon: 'albums-outline' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sortButton, sortBy === option.id && styles.sortButtonActive]}
                  onPress={() => setSortBy(option.id as any)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={16}
                    color={sortBy === option.id ? '#fff' : '#999'}
                  />
                  <Text style={[styles.sortButtonText, sortBy === option.id && styles.sortButtonTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Song List */}
      <FlatList
        data={sortedSongs}
        renderItem={renderSongCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          sortedSongs.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
          />
        }
      />

      {/* Full Screen Player Modal */}
      <Modal
        visible={showPlayer && currentSong !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {currentSong && (
          <AudioPlayer
            song={currentSong}
            onClose={() => setShowPlayer(false)}
            autoPlay={true}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  filters: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  filterSection: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontWeight: '500',
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterPillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterPillText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  sortButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  songArtwork: {
    width: 60,
    height: 60,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  songMeta: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  songDuration: {
    fontSize: 11,
    color: '#666',
  },
  songActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
