/**
 * src/components/poster/RainbowCatPopup.tsx
 *
 * Popup de celebrare cu animația „black rainbow cat".
 * Apare ca un card centrat cu overlay semi-transparent —
 * canvas-ul rămâne vizibil dedesubt.
 *
 * Se închide la tap sau când animația Lottie s-a terminat.
 * Are un fallback auto-dismiss după 5 secunde.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors, Radius, Typography } from '../../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_SIZE = Math.min(SCREEN_W * 0.72, 300);

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: any;
  onDone: () => void;
}

export function RainbowCatPopup({ source, onDone }: Props) {
  const overlayOp  = useRef(new Animated.Value(0)).current;
  const cardScale  = useRef(new Animated.Value(0.65)).current;
  const cardOp     = useRef(new Animated.Value(0)).current;
  const doneCalledRef = useRef(false);

  const dismiss = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;

    Animated.parallel([
      Animated.timing(overlayOp, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.75,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  };

  useEffect(() => {
    // Fade-in overlay + spring card
    Animated.parallel([
      Animated.timing(overlayOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 130,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    // Fallback auto-dismiss
    const timer = setTimeout(dismiss, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TouchableWithoutFeedback onPress={dismiss}>
      <Animated.View style={[styles.overlay, { opacity: overlayOp }]}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOp,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <LottieView
            source={source}
            autoPlay
            loop={false}
            onAnimationFinish={dismiss}
            style={styles.animation}
            resizeMode="contain"
          />

          <View style={styles.footer}>
            <Text style={styles.tapHint}>TAP TO CONTINUE</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: '#0d0d14',
    borderRadius: Radius.lg ?? 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  animation: {
    width: CARD_SIZE,
    height: CARD_SIZE,
  },
  footer: {
    paddingTop: 2,
    paddingBottom: 4,
    alignItems: 'center',
  },
  tapHint: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: Typography.fontSizes.xs ?? 11,
    fontWeight: Typography.fontWeights.black ?? '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
