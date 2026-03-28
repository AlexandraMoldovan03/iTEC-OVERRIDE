/**
 * app/(auth)/team-select.tsx
 * Crew selection — graffiti faction cards cu badge-urile echipelor.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { TEAMS } from '../../src/constants/teams';
import { TEAM_BADGE_IMAGES } from '../../src/constants/badges';
import { Team, TeamId } from '../../src/types/team';
import { TEAM_COLORS } from '../../src/theme/colors';
import { Button, ScreenContainer } from '../../src/components/ui';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';

export default function TeamSelectScreen() {
  const params = useLocalSearchParams<{
    username?: string | string[];
    email?: string | string[];
    password?: string | string[];
  }>();

  const { register, isLoading, error, clearError } = useAuthStore();
  const router = useRouter();

  const [selectedTeam, setSelectedTeam] = useState<TeamId | null>(null);
  const [localError, setLocalError] = useState<string>('');

  const getParamValue = (value?: string | string[]) => {
    if (Array.isArray(value)) return value[0] ?? '';
    return value ?? '';
  };

  const handleJoin = async () => {
    if (!selectedTeam || isLoading) return;

    clearError();
    setLocalError('');

    const username = getParamValue(params.username).trim();
    const email    = getParamValue(params.email).trim();
    const password = getParamValue(params.password);

    if (!username || !email || !password) {
      setLocalError('Date lipsă. Întoarce-te și completează din nou înregistrarea.');
      return;
    }

    const success = await register(username, email, password, selectedTeam);

    if (success) {
      router.replace('/(main)/home');
      return;
    }

    const latestError = useAuthStore.getState().error;
    if (latestError) {
      Alert.alert('Registration failed', latestError);
    }
  };

  return (
    <ScreenContainer scrollable padded>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.step}>STEP 2 OF 2</Text>
        <Text style={styles.title}>Choose{'\n'}Your Crew.</Text>
        <View style={styles.accentLine} />
        <Text style={styles.subtitle}>
          Your colors mark everything you create.{'\n'}
          Pick wisely — you can't switch.
        </Text>
      </View>

      {/* ── Team cards ───────────────────────────────────── */}
      <View style={styles.cards}>
        {TEAMS.map((team: Team) => {
          const tc         = TEAM_COLORS[team.id as TeamId];
          const isSelected = selectedTeam === team.id;
          const badgeImg   = TEAM_BADGE_IMAGES[team.id as TeamId];

          return (
            <TouchableOpacity
              key={team.id}
              onPress={() => setSelectedTeam(team.id as TeamId)}
              activeOpacity={0.85}
              style={[
                styles.card,
                isSelected && {
                  borderColor:    tc.primary,
                  backgroundColor: `${tc.primary}12`,
                  shadowColor:    tc.glow,
                  shadowOpacity:  0.7,
                  shadowRadius:   18,
                  elevation:      10,
                },
              ]}
            >
              {/* ── Badge imagine echipă ────────────────── */}
              <View style={[
                styles.badgeWrap,
                isSelected && {
                  shadowColor:   tc.glow,
                  shadowOpacity: 1,
                  shadowRadius:  16,
                },
              ]}>
                <Image
                  source={badgeImg}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
                {/* Inel de selecție glow în jurul badge-ului */}
                {isSelected && (
                  <View style={[
                    styles.selectedRing,
                    {
                      borderColor: tc.primary,
                      shadowColor: tc.glow,
                    },
                  ]} />
                )}
              </View>

              {/* ── Info echipă ─────────────────────────── */}
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={[styles.teamName, { color: tc.primary }]}>
                    {team.name}
                  </Text>
                  {/* Checkmark selecție */}
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: tc.primary }]}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.tagline, { color: tc.accent }]}>
                  "{team.tagline}"
                </Text>
                <Text style={styles.description}>{team.description}</Text>
              </View>

              {/* Glow bar pe marginea stângă */}
              <View
                style={[
                  styles.colorBar,
                  {
                    backgroundColor: tc.primary,
                    shadowColor:     tc.glow,
                    shadowOpacity:   isSelected ? 1 : 0.5,
                    shadowRadius:    6,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {!!(localError || error) && (
        <Text style={styles.error}>⚠ {localError || error}</Text>
      )}

      <Button
        label="⚡ Enter the Arena"
        onPress={handleJoin}
        loading={isLoading}
        disabled={!selectedTeam || isLoading}
        fullWidth
        style={[
          styles.joinBtn,
          selectedTeam && {
            backgroundColor: TEAM_COLORS[selectedTeam].primary,
            borderColor:     TEAM_COLORS[selectedTeam].primary,
            shadowColor:     TEAM_COLORS[selectedTeam].glow,
            shadowOpacity:   0.7,
            shadowRadius:    14,
          },
        ]}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop:    Spacing[4],
    paddingBottom: Spacing[6],
    gap:           Spacing[2],
  },
  step: {
    fontSize:      Typography.fontSizes.xs,
    fontWeight:    Typography.fontWeights.black,
    color:         Colors.accentYellow,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  title: {
    fontSize:    Typography.fontSizes['4xl'],
    fontWeight:  Typography.fontWeights.black,
    color:       Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.tight,
    lineHeight:  Typography.fontSizes['4xl'] * Typography.lineHeights.tight,
  },
  accentLine: {
    height:          3,
    width:           48,
    backgroundColor: Colors.accentYellow,
    borderRadius:    2,
    marginTop:       Spacing[2],
    shadowColor:     Colors.accentYellow,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.8,
    shadowRadius:    8,
  },
  subtitle: {
    fontSize:   Typography.fontSizes.sm,
    color:      Colors.textMuted,
    lineHeight: Typography.fontSizes.sm * Typography.lineHeights.relaxed,
    letterSpacing: Typography.letterSpacing.normal,
    marginTop:  Spacing[1],
  },

  // ── Cards ──────────────────────────────────────────────────
  cards: {
    gap:          Spacing[4],
    marginBottom: Spacing[8],
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.sm,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    flexDirection:   'row',
    alignItems:      'center',
    overflow:        'hidden',
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0,
    shadowRadius:    0,
    padding:         Spacing[3],
    gap:             Spacing[3],
  },

  // ── Badge ──────────────────────────────────────────────────
  badgeWrap: {
    width:        100,
    height:       100,
    flexShrink:   0,
    shadowOffset: { width: 0, height: 0 },
    position:     'relative',
  },
  badgeImage: {
    width:  100,
    height: 100,
  },
  selectedRing: {
    position:     'absolute',
    top:          -4,
    left:         -4,
    right:        -4,
    bottom:       -4,
    borderRadius: 54,
    borderWidth:  2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius:  10,
  },

  // ── Info ───────────────────────────────────────────────────
  cardBody: {
    flex: 1,
    gap:  Spacing[1],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing[2],
  },
  teamName: {
    fontSize:      Typography.fontSizes.lg,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  checkBadge: {
    width:          20,
    height:         20,
    borderRadius:   10,
    alignItems:     'center',
    justifyContent: 'center',
  },
  checkText: {
    color:      Colors.black,
    fontSize:   10,
    fontWeight: Typography.fontWeights.black,
  },
  tagline: {
    fontSize:   Typography.fontSizes.xs,
    fontStyle:  'italic',
    fontWeight: Typography.fontWeights.semibold,
  },
  description: {
    fontSize:   Typography.fontSizes.xs,
    color:      Colors.textSecondary,
    lineHeight: Typography.fontSizes.xs * Typography.lineHeights.relaxed,
  },

  // ── Left glow bar ──────────────────────────────────────────
  colorBar: {
    position: 'absolute',
    top:      0,
    left:     0,
    width:    4,
    bottom:   0,
    shadowOffset: { width: 0, height: 0 },
  },

  // ── Bottom ─────────────────────────────────────────────────
  error: {
    color:         Colors.error,
    fontSize:      Typography.fontSizes.xs,
    fontWeight:    Typography.fontWeights.bold,
    textAlign:     'center',
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom:  Spacing[4],
  },
  joinBtn: {
    marginBottom: Spacing[8],
  },
});
