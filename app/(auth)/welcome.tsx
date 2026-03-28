import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background graffiti doodles */}
      <View style={styles.bgLayer}>
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
      </View>

      {/* Top sticker */}
      <View style={styles.topBadgeWrap}>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>PUT YOUR TAG ON THE CITY</Text>
        </View>
      </View>

      {/* Center hero */}
      <View style={styles.hero}>
        <View style={styles.smallStickerLeft}>
          <Text style={styles.smallStickerText}>NEW</Text>
        </View>

        <View style={styles.smallStickerRight}>
          <Text style={styles.smallStickerText}>WILD</Text>
        </View>

        <Text style={styles.mural}>MURAL</Text>

        <View style={styles.sprayWrap}>
          <LinearGradient
            colors={['#ff49c6', '#ff2ea6', '#ff66d9']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.spray}
          >
            <Text style={styles.war}>WAR</Text>
          </LinearGradient>
        </View>

        <View style={styles.yearBadge}>
          <Text style={styles.yearText}>2026</Text>
        </View>

        <Text style={styles.sub}>
          SCAN POSTERS. CLAIM SPOTS. LEAVE YOUR MARK.
        </Text>
      </View>

      {/* Bottom card */}
      <View style={styles.bottomPanel}>
        <View style={styles.panelDecor1} />
        <View style={styles.panelDecor2} />

        <Text style={styles.panelTitle}>
          THE STREET{'\n'}IS YOUR CANVAS
        </Text>

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
      </View>
    </View>
  );
}

const neonPink = '#ff43bf';
const neonPurple = '#9b5cff';
const neonBlue = '#2f7bff';
const neonYellow = '#ffe44d';
const neonGreen = '#77ff5f';
const paper = '#f5f1eb';
const black = '#080808';

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
  doodle1: {
    top: 90,
    left: 28,
    color: neonYellow,
    fontSize: 22,
    transform: [{ rotate: '-12deg' }],
  },
  doodle2: {
    top: 140,
    right: 28,
    color: neonBlue,
    fontSize: 30,
    transform: [{ rotate: '15deg' }],
  },
  doodle3: {
    top: 260,
    left: 18,
    color: neonGreen,
    fontSize: 24,
  },
  doodle4: {
    top: 330,
    right: 34,
    color: neonPink,
    fontSize: 28,
  },
  doodle5: {
    top: 210,
    right: 70,
    color: neonYellow,
    fontSize: 18,
    transform: [{ rotate: '-10deg' }],
  },
  doodle6: {
    bottom: 290,
    left: 34,
    color: neonBlue,
    fontSize: 22,
  },
  doodle7: {
    bottom: 220,
    right: 32,
    color: neonGreen,
    fontSize: 18,
  },
  doodle8: {
    bottom: 170,
    left: 60,
    color: neonPink,
    fontSize: 30,
    transform: [{ rotate: '-12deg' }],
  },
  doodle9: {
    bottom: 120,
    right: 28,
    color: neonPurple,
    fontSize: 24,
    fontWeight: '900',
    transform: [{ rotate: '-8deg' }],
  },
  doodle10: {
    bottom: 145,
    left: 22,
    color: neonBlue,
    fontSize: 22,
    fontWeight: '900',
    transform: [{ rotate: '8deg' }],
  },

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
    shadowOpacity: 0.35,
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
    top: 70,
    backgroundColor: neonBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '-15deg' }],
  },
  smallStickerRight: {
    position: 'absolute',
    right: 24,
    top: 120,
    backgroundColor: neonGreen,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '12deg' }],
  },
  smallStickerText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },

  mural: {
    color: paper,
    fontSize: width < 380 ? 54 : 64,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    lineHeight: width < 380 ? 58 : 68,
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  sprayWrap: {
    marginTop: -6,
    marginBottom: 12,
    transform: [{ rotate: '-4deg' }],
  },
  spray: {
    paddingHorizontal: 26,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#000',
    shadowColor: neonPink,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  war: {
    color: '#fff',
    fontSize: width < 380 ? 52 : 64,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  yearBadge: {
    backgroundColor: paper,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: '#000',
    transform: [{ rotate: '8deg' }],
    marginBottom: 18,
  },
  yearText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.3,
  },

  sub: {
    color: '#d9d9d9',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    lineHeight: 22,
    maxWidth: 320,
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