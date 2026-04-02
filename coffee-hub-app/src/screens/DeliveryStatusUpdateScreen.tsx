import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { CardContainer } from '../components/ui/CardContainer';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { DELIVERY_ROUTES } from '../constants/routes';
import { RoleScreenFrame } from '../features/roles/components/RoleScreenFrame';
import type { DeliveryStackParamList } from '../navigation/types';
import { useTheme, useThemedStyles } from '../theme';

type DeliveryNavigation = NativeStackNavigationProp<DeliveryStackParamList>;

export function DeliveryStatusUpdateScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);

  return (
    <RoleScreenFrame
      eyebrow="Delivery status"
      title="Status update"
      subtitle="Delivery users now have their own status workspace, separate from customer ordering and admin order controls."
    >
      <CardContainer>
        <Text style={styles.title}>Role-safe status workflow</Text>
        <Text style={styles.body}>
          Use this screen for delivery-only actions like availability, pickup, and out-for-delivery updates once the operational APIs are connected.
        </Text>
      </CardContainer>

      <CardContainer style={styles.section}>
        <Text style={styles.title}>Quick links</Text>
        <View style={styles.actions}>
          <PrimaryButton
            title="Back to Active Orders"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.ACTIVE_ORDERS)}
          />
          <PrimaryButton
            title="Profile"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.PROFILE)}
            variant="secondary"
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
