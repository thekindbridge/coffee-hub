import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import type { DeliveryTimelineStep } from '../../delivery-agent/utils/presentation';
import { getDeliveryPalette } from './designSystem';

type DeliveryTimelineProps = {
  compact?: boolean;
  steps: DeliveryTimelineStep[];
};

const getIconName = (
  step: DeliveryTimelineStep,
): keyof typeof Ionicons.glyphMap => {
  if (step.state === 'completed') {
    return 'checkmark';
  }
  if (step.state === 'current') {
    return 'bicycle';
  }

  return 'ellipse';
};

export function DeliveryTimeline({ compact = false, steps }: DeliveryTimelineProps) {
  const { theme } = useTheme();
  const palette = getDeliveryPalette(theme);
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.list}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCompleted = step.state === 'completed';
        const isCurrent = step.state === 'current';

        return (
          <View key={`${step.title}-${index}`} style={styles.row}>
            <View style={styles.iconColumn}>
              <View
                style={[
                  styles.iconWrap,
                  isCompleted ? styles.iconCompleted : null,
                  isCurrent ? styles.iconCurrent : null,
                ]}
              >
                <Ionicons
                  color={isCompleted || isCurrent ? palette.background : palette.textMuted}
                  name={getIconName(step)}
                  size={compact ? 12 : 14}
                />
              </View>
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    compact ? styles.lineCompact : null,
                    isCompleted || isCurrent ? styles.lineActive : null,
                  ]}
                />
              ) : null}
            </View>

            <View style={styles.copy}>
              <Text
                style={[
                  styles.eyebrow,
                  isCurrent ? styles.eyebrowCurrent : null,
                ]}
              >
                {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Next'}
              </Text>
              <Text
                style={[
                  styles.title,
                  compact ? styles.titleCompact : null,
                  step.state === 'pending' ? styles.titlePending : null,
                ]}
              >
                {step.title}
              </Text>
              {step.description ? (
                <Text
                  style={[
                    styles.description,
                    compact ? styles.descriptionCompact : null,
                    step.state === 'pending' ? styles.descriptionPending : null,
                  ]}
                >
                  {step.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getDeliveryPalette(theme);

  return StyleSheet.create({
    list: {
      gap: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    iconColumn: {
      alignItems: 'center',
      width: 22,
    },
    iconWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: palette.chip,
      borderWidth: 1,
      borderColor: palette.divider,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    iconCompleted: {
      backgroundColor: palette.blush,
      borderColor: palette.blush,
    },
    iconCurrent: {
      backgroundColor: 'rgba(232, 188, 183, 0.86)',
      borderColor: 'rgba(232, 188, 183, 0.86)',
      shadowColor: palette.blush,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 4,
    },
    line: {
      width: 2,
      flex: 1,
      minHeight: 38,
      marginTop: 3,
      backgroundColor: palette.divider,
      borderRadius: 999,
    },
    lineCompact: {
      minHeight: 22,
    },
    lineActive: {
      backgroundColor: palette.blush,
    },
    copy: {
      flex: 1,
      paddingBottom: theme.spacing.xs,
    },
    eyebrow: {
      fontSize: theme.typography.eyebrow,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: palette.textMuted,
    },
    eyebrowCurrent: {
      color: palette.blush,
    },
    title: {
      marginTop: 4,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '800',
      color: palette.text,
    },
    titleCompact: {
      fontSize: 13,
      lineHeight: 17,
    },
    titlePending: {
      color: palette.textMuted,
    },
    description: {
      marginTop: 4,
      fontSize: 13,
      lineHeight: 20,
      color: palette.textMuted,
    },
    descriptionCompact: {
      lineHeight: 18,
    },
    descriptionPending: {
      color: palette.textMuted,
      opacity: 0.84,
    },
  });
};
