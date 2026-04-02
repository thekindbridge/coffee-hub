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

export function DeliveryTrackingScreen() {
  const navigation = useNavigation<DeliveryNavigation>();
  const styles = useThemedStyles(createStyles);

  return (
    <RoleScreenFrame
      eyebrow="Delivery tracking"
      title="Live tracking"
      subtitle="This screen is ready for agent location, route guidance, and delivery-session views tied to delivery accounts."
    >
      <CardContainer>
        <Text style={styles.title}>Tracking foundation</Text>
        <Text style={styles.body}>
          The routing layer already separates delivery users from customer checkout. You can now connect live delivery_sessions and agent_locations data here.
        </Text>
      </CardContainer>

      <CardContainer style={styles.section}>
        <View style={styles.actions}>
          <PrimaryButton
            title="Status Update"
            onPress={() => navigation.navigate(DELIVERY_ROUTES.STATUS_UPDATE)}
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
    gap: theme.spacing.sm,
  },
});
