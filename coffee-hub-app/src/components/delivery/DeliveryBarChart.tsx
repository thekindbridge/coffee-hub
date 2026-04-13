import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { getDeliveryPalette } from './designSystem';

type DeliveryBarChartPoint = {
  label: string;
  total: number;
};

type DeliveryBarChartProps = {
  highlightedIndex?: number;
  points: DeliveryBarChartPoint[];
};

export function DeliveryBarChart({
  highlightedIndex,
  points,
}: DeliveryBarChartProps) {
  const styles = useThemedStyles(createStyles);
  const maxValue = Math.max(...points.map(point => point.total), 1);
  const activeIndex = highlightedIndex ?? Math.max(
    0,
    points.findIndex(point => point.total === maxValue),
  );

  return (
    <View style={styles.chartWrap}>
      <View style={styles.barsRow}>
        {points.map((point, index) => {
          const ratio = maxValue === 0 ? 0.18 : point.total / maxValue;
          const height = 46 + (ratio * 64);
          const isHighlighted = index === activeIndex;

          return (
            <View key={`${point.label}-${index}`} style={styles.barColumn}>
              {isHighlighted ? (
                <LinearGradient
                  colors={['#F7D1CA', '#F3BEAF', '#8E635B']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={[styles.bar, { height }, styles.highlightBar]}
                />
              ) : (
                <View style={[styles.bar, { height }]} />
              )}
              <Text style={styles.barLabel}>{point.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getDeliveryPalette(theme);

  return StyleSheet.create({
    chartWrap: {
      marginTop: theme.spacing.lg,
    },
    barsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 8,
    },
    barColumn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
    },
    bar: {
      width: '100%',
      minHeight: 40,
      borderRadius: 10,
      backgroundColor: palette.chartBarIdle,
      opacity: 0.52,
    },
    highlightBar: {
      opacity: 1,
      shadowColor: palette.blush,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.22,
      shadowRadius: 16,
      elevation: 4,
    },
    barLabel: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      color: palette.text,
    },
  });
};
