/**
 * app/(auth)/team-select.tsx
 * Team selection during onboarding. Receives credentials via params from register.tsx.
 * On confirm: calls register and lets route guard redirect to home.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { TEAMS } from '../../src/constants/teams';
import { Team } from '../../src/types/team';
import { TeamId } from '../../src/types/team';
import { TEAM_COLORS } from '../../src/theme/colors';
import { Button, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';

export default function TeamSelectScreen() {
  const params = useLocalSearchParams<{ username: string; email: string; password: string }>();
  const { register, isLoading, error } = useAuthStore();
  const router = useRouter();

  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);

  const handleJoin = async () => {
    if (!selectedTeam) return;
    await register(params.username, params.email, params.password, selectedTeam);
    // Route guard in _layout.tsx will redirect to home
  };

  return (
    <ScreenContainer scrollable padded>
      <View style={styles.header}>
        <Text style={styles.title}>Choose your crew</Text>
        <Text style={styles.subtitle}>
          Your team colors will mark everything you create.{'\n'}Pick wisely — you can't switch.
        </Text>
      </View>

      <View style={styles.cards}>
        {TEAMS.map((team: Team) => {
          const tc = TEAM_COLORS[team.id as TeamId];
          const isSelected = selectedTeam === team.id;

          return (
            <TouchableOpacity
              key={team.id}
              onPress={() => setSelectedTeam(team.id as TeamId)}
              activeOpacity={0.85}
              style={[
                styles.card,
                isSelected && {
                  borderColor: tc.primary,
                  backgroundColor: tc.primary + '18',
                },
              ]}
            >
              {/* Selection ring */}
              <View style={[styles.selectionDot, isSelected && { backgroundColor: tc.primary }]} />

              <View style={styles.cardBody}>
                <Text style={[styles.teamName, { color: tc.primary }]}>{team.name}</Text>
                <Text style={[styles.tagline, { color: tc.accent }]}>&ldquo;{team.tagline}&rdquo;</Text>
                <Text style={styles.description}>{team.description}</Text>
              </View>

              {/* Color bar */}
              <View style={[styles.colorBar, { backgroundColor: tc.primary }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Enter the Arena"
        onPress={handleJoin}
        loading={isLoading}
        disabled={!selectedTeam}
        fullWidth
        style={styles.joinBtn}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Spacing[4],
    paddingBottom: Spacing[6],
    gap: Spacing[2],
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizes.base * Typography.lineHeights.relaxed,
  },
  cards: {
    gap: Spacing[4],
    marginBottom: Spacing[8],
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing[4],
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing[3],
    marginTop: 2,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: Spacing[1],
  },
  teamName: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
    marginBottom: Spacing[1],
  },
  description: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSizes.sm * Typography.lineHeights.relaxed,
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 5,
    bottom: 0,
    borderTopRightRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  error: {
    color: Colors.error,
    fontSize: Typography.fontSizes.sm,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
  joinBtn: {
    marginBottom: Spacing[8],
    backgroundColor: Colors.accentPurple,
  },
});
