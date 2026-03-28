import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';

const { width } = Dimensions.get('window');
const LOGO = require('./_layout/logo1.png');

export default function IndexPage() {
  const { isAuthenticated, isLoading } = useAuthStore();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.85)).current;
  const dotOpacity  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Logo apare rapid
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();

    // Dots pulsează
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View style={[styles.dotRow, { opacity: dotOpacity }]}>
          <View style={[styles.dot, { backgroundColor: '#9b5cff' }]} />
          <View style={[styles.dot, { backgroundColor: '#ff43bf' }]} />
          <View style={[styles.dot, { backgroundColor: '#77ff5f' }]} />
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
    backgroundColor: '#080808',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  logo: {
    width: width * 0.72,
    height: width * 0.46,
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
