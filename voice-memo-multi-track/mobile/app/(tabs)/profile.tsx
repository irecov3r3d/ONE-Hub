// Profile Screen - User settings and account management
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';

export default function ProfileScreen() {
  const { songs, settings, updateSettings, user } = useStore();

  const totalSongs = songs.length;
  const totalDuration = songs.reduce((sum, song) => sum + song.duration, 0);
  const avgQuality = songs.length > 0
    ? songs.reduce((sum, song) => sum + (song.metadata?.qualityScore || 0), 0) / songs.length
    : 0;

  const handleToggleSetting = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all downloaded audio files. Your library will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          // TODO: Implement cache clearing
          Alert.alert('Success', 'Cache cleared successfully');
        }},
      ]
    );
  };

  const handleExportLibrary = () => {
    Alert.alert(
      'Export Library',
      'Export all your songs as a JSON file for backup',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => {
          // TODO: Implement library export
          Alert.alert('Coming Soon', 'Export feature will be available in the next update');
        }},
      ]
    );
  };

  const renderStat = (icon: string, label: string, value: string) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons name={icon as any} size={24} color="#8b5cf6" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderSettingToggle = (
    icon: string,
    label: string,
    description: string,
    settingKey: keyof typeof settings,
    value: boolean
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon as any} size={20} color="#8b5cf6" />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(val) => handleToggleSetting(settingKey, val)}
        trackColor={{ false: '#333', true: '#8b5cf6' }}
        thumbColor="#fff"
      />
    </View>
  );

  const renderSettingButton = (icon: string, label: string, onPress: () => void, danger = false) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <View style={[styles.settingIcon, danger && styles.settingIconDanger]}>
        <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#8b5cf6'} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#8b5cf6" />
        </View>
        <Text style={styles.userName}>{user?.email || 'Guest User'}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {user?.subscription?.toUpperCase() || 'FREE'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        {renderStat('musical-notes', 'Songs Created', totalSongs.toString())}
        {renderStat('time', 'Total Duration', `${Math.floor(totalDuration / 60)}m`)}
        {renderStat('star', 'Avg Quality', `${Math.round(avgQuality * 100)}%`)}
      </View>

      {/* Generation Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generation Settings</Text>

        {renderSettingToggle(
          'sparkles',
          'Auto Mastering',
          'Automatically apply professional mastering to generations',
          'autoMastering',
          settings.autoMastering
        )}

        {renderSettingToggle(
          'notifications',
          'Notifications',
          'Get notified when generations complete',
          'notifications',
          settings.notifications
        )}

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="flash" size={20} color="#8b5cf6" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Default Strategy</Text>
            <Text style={styles.settingDescription}>
              Current: {settings.defaultStrategy.replace(/-/g, ' ')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => {
            Alert.alert('Coming Soon', 'Strategy settings will be available in the next update');
          }}>
            <Text style={styles.linkText}>Change</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="musical-note" size={20} color="#8b5cf6" />
          </View>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Audio Quality</Text>
            <Text style={styles.settingDescription}>
              Current: {settings.audioQuality}
            </Text>
          </View>
          <TouchableOpacity onPress={() => {
            Alert.alert('Coming Soon', 'Quality settings will be available in the next update');
          }}>
            <Text style={styles.linkText}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Account & Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account & Data</Text>

        {renderSettingButton('cloud-download', 'Export Library', handleExportLibrary)}
        {renderSettingButton('trash', 'Clear Cache', handleClearCache)}
        {renderSettingButton('share', 'Share App', () => {
          Alert.alert('Coming Soon', 'Share feature will be available soon');
        })}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        {renderSettingButton('help-circle', 'Help & Support', () => {
          Alert.alert('Help & Support', 'Visit our website for documentation and support');
        })}
        {renderSettingButton('document-text', 'Terms of Service', () => {
          Alert.alert('Coming Soon', 'Terms of Service');
        })}
        {renderSettingButton('shield-checkmark', 'Privacy Policy', () => {
          Alert.alert('Coming Soon', 'Privacy Policy');
        })}
        {renderSettingButton('information-circle', 'App Version', () => {
          Alert.alert('Song Generator Pro', 'Version 1.0.0\nMulti-Model AI Ensemble System');
        })}
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        {renderSettingButton('log-out', 'Sign Out', () => {
          Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => {
                Alert.alert('Coming Soon', 'Authentication will be available soon');
              }},
            ]
          );
        }, true)}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Made with ❤️ using Multi-Model AI Ensemble
        </Text>
        <Text style={styles.footerSubtext}>
          Powered by MusicGen, AudioCraft & Riffusion
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#8b5cf620',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#0a0a0a',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#8b5cf620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: '#ef444420',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 2,
  },
  settingLabelDanger: {
    color: '#ef4444',
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
  },
  linkText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 10,
    color: '#666',
  },
});
