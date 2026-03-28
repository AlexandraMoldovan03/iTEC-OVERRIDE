import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

export default function IndexPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Așteptăm restoreSession() să termine înainte de orice redirect
  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>MURAL{'\n'}WAR</Text>
        <Animated.View style={[styles.dotRow, { opacity: pulse }]}>
          <View style={[styles.dot, { backgroundColor: '#A855F7' }]} />
          <View style={[styles.dot, { backgroundColor: '#FF1CF7' }]} />
          <View style={[styles.dot, { backgroundColor: '#39FF14' }]} />
        </Animated.View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    lineHeight: 56,
    textTransform: 'uppercase',
    textShadowColor: '#A855F7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
