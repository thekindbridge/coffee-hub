import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AdminNavigator as AdminStackNavigator } from './AdminNavigator';
import { useAccessRoles } from '../hooks';

interface RoleBasedNavigatorProps {
  currentUserEmail: string;
}

export const RoleBasedNavigator: React.FC<RoleBasedNavigatorProps> = ({ 
  currentUserEmail 
}) => {
  const [normalizedEmail, setNormalizedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUserEmail) {
      setNormalizedEmail(currentUserEmail.trim().toLowerCase());
    }
    setIsLoading(false);
  }, [currentUserEmail]);

  const { isAdmin } = useAccessRoles(
    currentUserEmail,
    normalizedEmail,
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5E3C" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isAdmin) {
    return <AdminStackNavigator />;
  }

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>Access Denied</Text>
      <Text style={styles.fallbackSubtext}>
        You don't have permission to access the admin panel.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    padding: 32,
  },
  fallbackText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  fallbackSubtext: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
});
