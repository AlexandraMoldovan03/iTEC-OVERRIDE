/**
 * src/components/poster/SwordBattleIntro.tsx
 *
 * Animație intro „Sword Battle" care apare o singură dată
 * când utilizatorul intră pe un poster.
 *
 * Joacă animația Lottie + sunetul sword.mp3 simultan,
 * apoi face fade-out și apelează onDone() — UI-ul normal devine vizibil.
 * Utilizatorul poate atinge ecranul pentru a sări peste intro.
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
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SWORD_AUDIO = require('../../../app/_layout/sword.mp3');

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Props {
  /** Sursa animației Lottie (require('../_layout/Sword Battle.json')) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: any;
  /** Apelat când animația s-a terminat sau utilizatorul a apăsat skip */
  onDone: () => void;
}

export function SwordBattleIntro({ source, onDone }: Props) {
  const opacity       = useRef(new Animated.Value(1)).current;
  const lottieRef     = useRef<LottieView>(null);
  const doneCalledRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const audioPlayerRef = useRef<any>(null);

  /** Oprește sunetul dacă rulează și eliberează player-ul */
  const stopAudio = () => {
    try {
      audioPlayerRef.current?.remove();
    } catch (_) {}
    audioPlayerRef.current = null;
  };

  const fadeOutAndDone = () => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    stopAudio();

    Animated.timing(opacity, {
      toValue:         0,
      duration:        380,
      useNativeDriver: true,
    }).start(() => onDone());
  };

  // Pornește sunetul simultan cu montarea componentei (= simultan cu Lottie autoPlay)
  useEffect(() => {
    let mounted = true;

    const startAudio = async () => {
      try {
        await setAudioModeAsync({ playsInSilentModeIOS: true });
        if (!mounted) return;
        const player = createAudioPlayer(SWORD_AUDIO);
        audioPlayerRef.current = player;
        player.play();
      } catch (_) {
        // Dacă sunetul nu pornește, intro-ul continuă normal
      }
    };

    startAudio();

    return () => {
      mounted = false;
      stopAudio();
    };
  }, []);

  // Fallback: dacă animația durează mai mult de 5s, ieșim oricum
  useEffect(() => {
    const timer = setTimeout(fadeOutAndDone, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <TouchableWithoutFeedback onPress={fadeOutAndDone}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <LottieView
          ref={lottieRef}
          source={source}
          autoPlay
          loop={false}
          onAnimationFinish={fadeOutAndDone}
          style={styles.animation}
          resizeMode="contain"
        />
        <View style={styles.skipWrap} pointerEvents="none">
          <Text style={styles.skipText}>TAP TO SKIP</Text>
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex:          9999,
    backgroundColor: '#09090C',
    alignItems:      'center',
    justifyContent:  'center',
  },
  animation: {
    width:  SCREEN_W,
    height: SCREEN_W,   // pătrat — animația sword battle e aprox 1:1
  },
  skipWrap: {
    position: 'absolute',
    bottom:   48,
    left:     0,
    right:    0,
    alignItems: 'center',
  },
  skipText: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
