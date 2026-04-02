import React from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoutCurrentUser, getCurrentAuthUser } from '../../services/auth/authService';

const buildAdminName = (email: string, displayName?: string | null) => {
  if (displayName?.trim()) {
    return displayName.trim();
  }

  const fallbackLocalPart = email.split('@')[0] || 'admin';
  return fallbackLocalPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

export function AdminProfileScreen() {
  const currentUser = getCurrentAuthUser();
  const adminEmail = currentUser?.email || 'coffeehubinkollu@gmail.com';
  const adminName = buildAdminName(adminEmail, currentUser?.displayName);
  const avatarLetter = adminName.charAt(0).toUpperCase() || 'A';

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Do you want to sign out of the admin account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            void logoutCurrentUser().catch(error => {
              console.error('Logout failed', error);
              Alert.alert('Logout Failed', 'Unable to log out right now.');
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Admin Account</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Signed-in admin details and a secure logout action.
        </Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>

          <Text style={styles.adminName}>{adminName || 'Coffee Hub Admin'}</Text>
          <Text style={styles.adminEmail}>{adminEmail}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>ADMIN</Text>
          </View>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Session</Text>
          <Text style={styles.actionDescription}>
            Logging out will return the app to the sign-in screen.
          </Text>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  eyebrow: {
    color: '#8B5E3C',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 24,
    padding: 24,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#8B5E3C',
    borderRadius: 999,
    height: 84,
    justifyContent: 'center',
    width: 84,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  adminName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },
  adminEmail: {
    color: '#B5AAA2',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 999,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  roleBadgeText: {
    color: '#E3C0A0',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  actionCard: {
    backgroundColor: '#171311',
    borderColor: 'rgba(196, 138, 90, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  actionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  actionDescription: {
    color: '#A59A92',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.24)',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 46,
  },
  logoutButtonText: {
    color: '#F2B6B6',
    fontSize: 14,
    fontWeight: '800',
  },
});
