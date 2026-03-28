import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { Colors, Spacing, Typography, Radius } from '../../theme';

type Props = {
  visible: boolean;
  imageSource: ImageSourcePropType;
  title?: string;
  subtitle?: string;
};

export function LeaderAlert({
  visible,
  imageSource,
  title = 'Sorry...',
  subtitle = 'Someone just passed you and took 1st place.',
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-18)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 90,
          friction: 8,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -18,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <Image source={imageSource} style={styles.image} resizeMode="contain" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    backgroundColor: 'rgba(10,10,10,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.lg ?? 18,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  image: {
    width: 72,
    height: 72,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: Typography.fontSizes.sm,
    lineHeight: 20,
  },
});