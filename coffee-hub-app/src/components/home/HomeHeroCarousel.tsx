import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useTheme, useThemedStyles } from '../../theme';
import { getAmbientShadow, getCustomerPalette } from '../customer/designSystem';
import { GlassSurface } from '../ui/GlassSurface';
import { ScalePressable } from '../ui/ScalePressable';

const AUTO_SLIDE_INTERVAL_MS = 2800;
const HERO_QUOTE = 'Fresh brews.\nCalm moments.';
const SERIF_FONT_FAMILY = Platform.select({
  android: 'serif',
  default: 'serif',
  ios: 'Georgia',
});
const HERO_IMAGE_OVERLAY_COLORS = [
  'rgba(20, 13, 6, 0.02)',
  'rgba(20, 13, 6, 0.12)',
  'rgba(20, 13, 6, 0.28)',
] as const;
const HERO_QUOTE_GRADIENT_COLORS = [
  'rgba(87, 66, 56, 0.22)',
  'rgba(34, 26, 19, 0.74)',
  'rgba(20, 13, 6, 0.96)',
] as const;
const HERO_QUOTE_BACKDROP_COLORS = [
  'rgba(255, 248, 239, 0.14)',
  'rgba(235, 228, 183, 0.08)',
  'rgba(235, 228, 183, 0)',
] as const;
const HERO_STEAM_COLORS = [
  'rgba(235, 228, 183, 0.12)',
  'rgba(235, 228, 183, 0.04)',
  'rgba(235, 228, 183, 0)',
] as const;
const HERO_SHEEN_COLORS = [
  'rgba(255, 255, 255, 0.12)',
  'rgba(255, 255, 255, 0.04)',
  'rgba(0, 0, 0, 0.06)',
] as const;

export type HomeHeroSlide = {
  couponCode?: string;
  eyebrow: string;
  id: string;
  imageUrl: string;
  subtitle: string;
  supportingText: string;
  title: string;
  visualTag: string;
};

type CarouselSlideItem = {
  key: string;
  realIndex: number;
  slide: HomeHeroSlide;
};

type HomeHeroCarouselProps = {
  onPressSlide?: (slide: HomeHeroSlide) => void;
  quoteCaption?: string;
  quoteText?: string;
  slides: HomeHeroSlide[];
};

export const HomeHeroCarousel = memo(function HomeHeroCarousel({
  onPressSlide,
  quoteCaption,
  quoteText = HERO_QUOTE,
  slides,
}: HomeHeroCarouselProps) {
  const { theme } = useTheme();
  const palette = getCustomerPalette(theme);
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const isLooping = slides.length > 1;
  const carouselSlides = useMemo<CarouselSlideItem[]>(() => {
    if (slides.length === 0) {
      return [];
    }

    const baseSlides = slides.map((slide, index) => ({
      key: slide.id,
      realIndex: index,
      slide,
    }));

    if (!isLooping) {
      return baseSlides;
    }

    const firstSlide = slides[0];
    const lastSlide = slides[slides.length - 1];

    return [
      {
        key: `${lastSlide.id}-leading-clone`,
        realIndex: slides.length - 1,
        slide: lastSlide,
      },
      ...baseSlides,
      {
        key: `${firstSlide.id}-trailing-clone`,
        realIndex: 0,
        slide: firstSlide,
      },
    ];
  }, [isLooping, slides]);
  const initialLoopIndex = isLooping ? 1 : 0;
  const listRef = useRef<FlatList<CarouselSlideItem>>(null);
  const activeIndexRef = useRef(initialLoopIndex);
  const isDraggingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const layoutWidth = measuredWidth || Math.max(width - (theme.spacing.md * 2), 0);
  const splitGap = theme.spacing.sm;
  const quoteWidth = Math.max((layoutWidth - splitGap) * 0.48, 0);
  const slideWidth = Math.max(layoutWidth - quoteWidth - splitGap, 0);

  const syncIndexFromOffset = (offset: number) => {
    if (slideWidth <= 0 || slides.length === 0 || carouselSlides.length === 0) {
      return;
    }

    const nextLoopIndex = Math.max(0, Math.min(carouselSlides.length - 1, Math.round(offset / slideWidth)));
    let resolvedLoopIndex = nextLoopIndex;
    let resolvedActiveIndex = carouselSlides[nextLoopIndex]?.realIndex ?? 0;

    if (isLooping) {
      if (nextLoopIndex === 0) {
        resolvedLoopIndex = slides.length;
        resolvedActiveIndex = slides.length - 1;
      } else if (nextLoopIndex === carouselSlides.length - 1) {
        resolvedLoopIndex = 1;
        resolvedActiveIndex = 0;
      }
    }

    activeIndexRef.current = resolvedLoopIndex;
    setActiveIndex(resolvedActiveIndex);

    if (resolvedLoopIndex !== nextLoopIndex) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          animated: false,
          offset: resolvedLoopIndex * slideWidth,
        });
      });
    }
  };

  useEffect(() => {
    activeIndexRef.current = initialLoopIndex;
    setActiveIndex(0);

    if (slideWidth > 0 && carouselSlides.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          animated: false,
          offset: initialLoopIndex * slideWidth,
        });
      });
    }
  }, [carouselSlides.length, initialLoopIndex, slideWidth]);

  useEffect(() => {
    const imageUrls = [...new Set(
      slides
        .map(slide => slide.imageUrl.trim())
        .filter(imageUrl => imageUrl.length > 0),
    )];

    void Promise.all(imageUrls.map(async imageUrl => {
      try {
        await Image.prefetch(imageUrl);
      } catch {
        return false;
      }

      return true;
    }));
  }, [slides]);

  useEffect(() => {
    if (!isLooping || slideWidth <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      if (isDraggingRef.current) {
        return;
      }

      const nextIndex = activeIndexRef.current + 1;
      listRef.current?.scrollToOffset({
        animated: true,
        offset: nextIndex * slideWidth,
      });
      activeIndexRef.current = nextIndex;
    }, AUTO_SLIDE_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [isLooping, slideWidth]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isDraggingRef.current = false;
    syncIndexFromOffset(event.nativeEvent.contentOffset.x);
  };

  return (
    <View
      style={styles.wrapper}
      onLayout={event => {
        const nextWidth = event.nativeEvent.layout.width;

        if (Math.abs(nextWidth - measuredWidth) >= 1) {
          setMeasuredWidth(nextWidth);
        }
      }}
    >
      <View style={styles.splitRow}>
        <GlassSurface
          depth="section"
          intensity={78}
          overlayColor={palette.surfaceGlass}
          style={[styles.quotePanel, styles.ambientShadow, { width: quoteWidth }]}
        >
          <LinearGradient
            colors={HERO_QUOTE_GRADIENT_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <LinearGradient
            colors={HERO_STEAM_COLORS}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.quoteGlow}
          />

          <LinearGradient
            colors={HERO_QUOTE_BACKDROP_COLORS}
            start={{ x: 0, y: 0.1 }}
            end={{ x: 1, y: 0.9 }}
            style={styles.quoteTextBackdrop}
          />

          <View style={styles.quoteCopy}>
            <Text style={styles.quoteText}>{quoteText}</Text>
            {quoteCaption ? (
              <Text style={styles.quoteCaption}>{quoteCaption}</Text>
            ) : null}
          </View>

          <View style={styles.quoteIconWrap}>
            <Ionicons name="cafe" size={18} color={palette.gold} />
          </View>
        </GlassSurface>

        <View style={[styles.carouselWrap, { width: slideWidth }]}>
          <FlatList
            ref={listRef}
            horizontal
            data={carouselSlides}
            keyExtractor={item => item.key}
            pagingEnabled
            bounces={false}
            decelerationRate="fast"
            disableIntervalMomentum
            directionalLockEnabled
            initialScrollIndex={initialLoopIndex}
            getItemLayout={(_, index) => ({
              index,
              length: slideWidth,
              offset: slideWidth * index,
            })}
            initialNumToRender={Math.min(4, carouselSlides.length)}
            maxToRenderPerBatch={4}
            onMomentumScrollEnd={handleMomentumEnd}
            onScrollBeginDrag={() => {
              isDraggingRef.current = true;
            }}
            overScrollMode="never"
            removeClippedSubviews={Platform.OS === 'android'}
            scrollEnabled={isLooping}
            showsHorizontalScrollIndicator={false}
            windowSize={3}
            renderItem={({ item }) => (
              <ScalePressable
                accessibilityLabel={item.slide.visualTag}
                accessibilityRole={onPressSlide ? 'button' : 'image'}
                onPress={onPressSlide ? () => onPressSlide(item.slide) : undefined}
                scaleTo={0.985}
                style={[styles.slidePressable, styles.ambientShadow, { width: slideWidth }]}
              >
                <View style={styles.slideCard}>
                  <Image
                    source={{ uri: item.slide.imageUrl, cache: 'force-cache' }}
                    style={styles.slideImage}
                    resizeMode="cover"
                  />

                  <LinearGradient
                    colors={HERO_IMAGE_OVERLAY_COLORS}
                    locations={[0, 0.48, 1]}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  <LinearGradient
                    colors={HERO_SHEEN_COLORS}
                    locations={[0, 0.38, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                </View>
              </ScalePressable>
            )}
          />

          {slides.length > 1 ? (
            <View style={styles.dotsRow}>
              {slides.map((slide, index) => (
                <View
                  key={slide.id}
                  style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => {
  const palette = getCustomerPalette(theme);

  return StyleSheet.create({
    ambientShadow: getAmbientShadow(theme),
    wrapper: {
      gap: theme.spacing.sm,
    },
    splitRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: theme.spacing.sm,
    },
    quotePanel: {
      minHeight: 214,
      borderRadius: 22,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 20,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    quoteGlow: {
      position: 'absolute',
      top: -18,
      right: -26,
      width: 148,
      height: 164,
      borderRadius: 82,
    },
    quoteTextBackdrop: {
      position: 'absolute',
      top: 36,
      bottom: 36,
      left: 10,
      right: 10,
      borderRadius: 26,
      opacity: 0.8,
    },
    quoteCopy: {
      flex: 1,
      justifyContent: 'center',
      gap: 12,
    },
    quoteText: {
      color: '#FFF9F3',
      fontFamily: SERIF_FONT_FAMILY,
      fontSize: 35,
      fontStyle: 'italic',
      fontWeight: '600',
      letterSpacing: -0.9,
      lineHeight: 42,
      textShadowColor: 'rgba(11, 8, 6, 0.34)',
      textShadowOffset: { width: 0, height: 6 },
      textShadowRadius: 18,
    },
    quoteCaption: {
      fontSize: 12,
      lineHeight: 19,
      color: 'rgba(241, 223, 211, 0.82)',
    },
    quoteIconWrap: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(235, 228, 183, 0.14)',
    },
    carouselWrap: {
      gap: 10,
    },
    slidePressable: {
      borderRadius: 22,
      overflow: 'hidden',
    },
    slideCard: {
      minHeight: 214,
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: palette.surfaceHigh,
    },
    slideImage: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.surfaceHighest,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 7,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(241, 223, 211, 0.22)',
    },
    dotActive: {
      width: 18,
      backgroundColor: palette.gold,
    },
  });
};
