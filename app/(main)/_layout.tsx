/**
 * app/(main)/_layout.tsx
 * Tab bar layout for authenticated screens.
 */

import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../../src/theme';
import { Platform } from 'react-native';

type IconName = 'home-outline' | 'home' | 'map-outline' | 'map' | 'account-outline' | 'account' | 'archive-outline' | 'archive';

interface TabIconProps {
  name: IconName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: TabIconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.bgSurface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 82 : 60,
        },
        tabBarActiveTintColor: Colors.accentPurple,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontSize: Typography.fontSizes.xs,
          fontWeight: Typography.fontWeights.medium as any,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'map' : 'map-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'archive' : 'archive-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'account' : 'account-outline'} color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}
