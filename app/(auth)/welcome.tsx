/**
 * app/(auth)/welcome.tsx
 * Graffiti hero — logo "MAKE IT SEEN" with cascading entry animations.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

// ── Asset Constants ──────────────────────────────────────────
const SPRAY1 = require('../_layout/spray1.png');
const SPRAY2 = require('../_layout/spray2.png');
const SPRAY3 = require('../_layout/spray3.png');
const SPRAY_CAN = require('../_layout/spray can.png');
const LOGO = require('../_layout/logo1.png');

// ── Colors ────────────────────────────────────────────────────
const neonPink   = '#ff43bf';
const neonPurple = '#9b5cff';
const neonBlue   = '#2f7bff';
const neonYellow = '#ffe44d';
const neonGreen  = '#77ff5f';
const black      = '#080808';

export default function WelcomeScreen() {
  const router = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Animation States & Refs ───────────────────────────────
  const [sprayFrame, setSprayFrame] = useState(0);
  const sprayOpacity = useRef(new Animated.Value(0)).current;
  
  const logoScale    = useRef(new Animated.Value(0.6)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const doodleOpacity = useRef(new Animated.Value(0)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeTransY  = useRef(new Animated.Value(-20)).current;
  const panelTransY  = useRef(new Animated.Value(80)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;

  const sprayImages = [SPRAY1, SPRAY2, SPRAY3];

  useEffect(() => {
    // 1. Core UI Entry Animations
    Animated.parallel([
      // Doodles fade in
      Animated.timing(doodleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      
      // Top Badge drops in
      Animated.sequence([
        Animated.delay(150),
        Animated.parallel([
          Animated.timing(badgeOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(badgeTransY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
        ]),
      ]),

      // Logo pops forward
      Animated.sequence([
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        ]),
      ]),

      // Bottom panel slides up
      Animated.sequence([
        Animated.delay(550),
        Animated.parallel([
          Animated.timing(panelOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.spring(panelTransY, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
        ]),
      ]),
    ]).start();

    // 2. Spray SFX and Visual Sequence
    const startSpraySequence = async () => {
      try {
        // Delay to sync with logo appearance
        await new Promise(resolve => setTimeout(resolve, 600));

        const { sound } = await Audio.Sound.createAsync(require('../_layout/spray.mp3'));
        soundRef.current = sound;
        await sound.playAsync();

        // Show spray overlay
        Animated.timing(sprayOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();

        // Animate frames
        setTimeout(() => setSprayFrame(1), 650);
        setTimeout(() => setSprayFrame(2), 1300);

        // Hide spray
        setTimeout(() => {
          Animated.timing(sprayOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start();
        }, 2000);

      } catch (e) {
        console.log('Animation sound error:', e);
      }
    };

    startSpraySequence();

    // Cleanup: Stop audio if user leaves screen early
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Background doodles ────────────────────────────── */}
      <Animated.View style={[styles.bgLayer, { opacity: doodleOpacity }]}>
        <Text style={[styles.doodle, styles.doodle1]}>✦</Text>
        <Text style={[styles.doodle, styles.doodle2]}>⚡</Text>
        <Text style={[styles.doodle, styles.doodle3]}>★</Text>
        <Text style={[styles.doodle, styles.doodle4]}>◎</Text>
        <Text style={[styles.doodle, styles.doodle5]}>?!</Text>
        <Text style={[styles.doodle, styles.doodle6]}>✿</Text>
        <Text style={[styles.doodle, styles.doodle7]}>◉</Text>
        <Text style={[styles.doodle, styles.doodle8]}>→</Text>
        <Text style={[styles.doodle, styles.doodle9]}>HAHA</Text>
        <Text style={[styles.doodle, styles.doodle10]}>BOOM</Text>
      </Animated.View>

      {/* ── Top badge ─────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.topBadgeWrap,
          { opacity: badgeOpacity, transform: [{ translateY: badgeTransY }] },
        ]}
      >
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>PUT YOUR TAG ON THE CITY</Text>
        </View>
      </Animated.View>

      {/* ── Hero logo ─────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.smallStickerLeft}>
          <Text style={styles.smallStickerText}>NEW</Text>
        </View>
        <View style={styles.smallStickerRight}>
          <Text style={styles.smallStickerText}>WILD</Text>
        </View>

        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          
          {/* Spray animation overlay */}
          <Animated.Image
            source={sprayImages[sprayFrame]}
            style={[styles.sprayOverlay, { opacity: sprayOpacity }]}
          />

          {/* Spray can icon */}
          <Image source={SPRAY_CAN} style={styles.sprayCan} />
        </Animated.View>

        <Text style={styles.sub}>
          SCAN POSTERS. CLAIM SPOTS. LEAVE YOUR MARK.
        </Text>
      </View>

      {/* ── Bottom panel ──────────────────────────────────── */}
      <Animated.View
        style={[
          styles.bottomPanel,
          { opacity: panelOpacity, transform: [{ translateY: panelTransY }] },
        ]}
      >
        <View style={styles.panelDecor1} />
        <View style={styles.panelDecor2} />

        <Text style={styles.panelTitle}>THE STREET{'\n'}IS YOUR CANVAS</Text>

        <Text style={styles.panelText}>
          Join the chaos, scan the walls, unlock battles, and own your territory.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.primaryBtn}
          onPress={() => router.push('/(auth)/register')}
        >
          <LinearGradient
            colors={['#9b5cff', '#ff43bf']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGradient}
          >
            <Text style={styles.primaryBtnText}>ENTER THE ARENA</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.secondaryBtnText}>I ALREADY HAVE A CREW</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: black,
    justifyContent: 'space-between',
    paddingTop: 64,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  doodle: {
    position: 'absolute',
    fontWeight: '900',
    opacity: 0.95,
  },
  doodle1:  { top: 90,    left: 28,  color: neonYellow, fontSize: 22, transform: [{ rotate: '-12deg' }] },
  doodle2:  { top: 140,   right: 28, color: neonBlue,   fontSize: 30, transform: [{ rotate: '15deg'  }] },
  doodle3:  { top: 260,   left: 18,  color: neonGreen,  fontSize: 24 },
  doodle4:  { top: 330,   right: 34, color: neonPink,   fontSize: 28 },
  doodle5:  { top: 210,   right: 70, color: neonYellow, fontSize: 18, transform: [{ rotate: '-10deg' }] },
  doodle6:  { bottom: 290, left: 34, color: neonBlue,   fontSize: 22 },
  doodle7:  { bottom: 220, right: 32,color: neonGreen,  fontSize: 18 },
  doodle8:  { bottom: 170, left: 60, color: neonPink,   fontSize: 30, transform: [{ rotate: '-12deg' }] },
  doodle9:  { bottom: 120, right: 28,color: neonPurple, fontSize: 24, fontWeight: '900', transform: [{ rotate: '-8deg' }] },
  doodle10: { bottom: 145, left: 22, color: neonBlue,   fontSize: 22, fontWeight: '900', transform: [{ rotate: '8deg'  }] },

  topBadgeWrap: {
    alignItems: 'center',
    zIndex: 3,
  },
  topBadge: {
    backgroundColor: neonYellow,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '-4deg' }],
    shadowColor: neonYellow,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  topBadgeText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1.2,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flex: 1,
    position: 'relative',
  },
  smallStickerLeft: {
    position: 'absolute',
    left: 24,
    top: 30,
    backgroundColor: neonBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '-15deg' }],
    zIndex: 2,
  },
  smallStickerRight: {
    position: 'absolute',
    right: 24,
    top: 70,
    backgroundColor: neonGreen,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '12deg' }],
    zIndex: 2,
  },
  smallStickerText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: neonPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 30,
    elevation: 12,
  },
  logo: {
    width: width * 0.82,
    height: width * 0.52,
  },
  sprayOverlay: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.6,
    resizeMode: 'contain',
  },
  sprayCan: {
    position: 'absolute',
    width: 60,
    height: 60,
    right: -10,
    bottom: -10,
    resizeMode: 'contain',
  },
  sub: {
    color: '#d9d9d9',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    lineHeight: 20,
    maxWidth: 300,
    marginTop: 4,
  },
  bottomPanel: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 34,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#1f1f1f',
    position: 'relative',
    overflow: 'hidden',
  },
  panelDecor1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 28,
    backgroundColor: neonBlue,
    top: -35,
    right: -35,
    transform: [{ rotate: '20deg' }],
    opacity: 0.95,
  },
  panelDecor2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: neonYellow,
    bottom: -30,
    left: -20,
    opacity: 0.95,
  },
  panelTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
    maxWidth: 260,
  },
  panelText: {
    color: '#c7c7c7',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginBottom: 22,
    maxWidth: 300,
  },
  primaryBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#000',
  },
  primaryGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: '#1b1b1b',
    borderWidth: 2,
    borderColor: '#2d2d2d',
  },
  secondaryBtnText: {
    color: '#f3f3f3',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
});