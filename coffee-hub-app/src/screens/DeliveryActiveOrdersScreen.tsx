import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { DELIVERY_ROUTES } from '../constants/routes';
import { RoleBadge } from '../features/roles/components/RoleBadge';
import { RoleScreenFrame } from '../features/roles/components/RoleScreenFrame';
import { useUserRole } from '../features/roles/hooks/useUserRole';
import type { DeliveryStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

export function DeliveryActiveOrdersScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);
  const { isDelivery } = useUserRole();

  return (
    <RoleScreenFrame
      eyebrow="Delivery panel"
      title="Active orders"
      subtitle="Delivery agents get a dedicated workspace whenever their agents/{email} document exists in Firestore."
    >
      <CardContainer>
        <RoleBadge label={isDelivery ? 'Delivery Agent' : 'Customer'} tone="delivery" />
        <Text style={styles.title}>Role-based delivery access is live</Text>
        <Text style={styles.body}>
          This route is reserved for delivery accounts and updates automatically if the underlying Firestore access document changes.
        </Text>
      </CardContainer>

      <CardContainer style={styles.section}>
        <Text style={styles.title}>Delivery tools</Text>
        <View style={styles.actions}>
          <PrimaryButton
            title="Tracking"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.TRACKING)}
          />
          <PrimaryButton
            title="Status Update"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.STATUS_UPDATE)}
            variant="secondary"
          />
          <PrimaryButton
            title="Profile"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
            variant="ghost"
          />
        </View>
      </CardContainer>
    </RoleScreenFrame>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  section: {
    marginTop: theme.spacing.lg,
  },
  title: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.subheading,
    fontWeight: '800',
    color: theme.colors.text,
  },
  body: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.body,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  actions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
