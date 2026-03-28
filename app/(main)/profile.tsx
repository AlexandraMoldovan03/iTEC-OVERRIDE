/**
 * app/(main)/profile.tsx
 * Artist profile — graffiti tag identity card, neon team glow.
 */

import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { TeamBadge } from '../../src/components/ui/TeamBadge';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Button } from '../../src/components/ui/Button';
import { TEAM_COLORS } from '../../src/theme/colors';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';
import { TeamId } from '../../src/types/team';
import { getTeamById } from '../../src/constants/teams';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const vaultCount = useVaultStore((s) => s.posters.length);

  if (!user) return null;

  const team = getTeamById(user.teamId);
  const tc = TEAM_COLORS[user.teamId as TeamId];

  const handleLogout = () => {
    Alert.alert('Leave the arena?', 'You will be logged out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          // Navigăm explicit la welcome după logout
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable padded>
      {/* ── Artist Identity ─────────────────────────────── */}
      <View style={styles.heroSection}>
        {/* Avatar with team color border + glow */}
        <View
          style={[
            styles.avatar,
            {
              borderColor: tc.primary,
              shadowColor: tc.glow,
            },
          ]}
        >
          <Text style={[styles.avatarText, { color: tc.primary }]}>
            {user.username[0].toUpperCase()}
          </Text>
        </View>

        <Text style={[styles.username, { color: tc.primary }]}>
          {user.username.toUpperCase()}
        </Text>
        <Text style={styles.email}>{user.email}</Text>
        <TeamBadge teamId={user.teamId} style={styles.teamBadge} />
      </View>

      {/* ── Team card ────────────────────────────────────── */}
      {team && (
        <View
          style={[
            styles.teamCard,
            {
              borderColor: tc.primary + '55',
              backgroundColor: tc.primary + '0D',
              shadowColor: tc.glow,
            },
          ]}
        >
          <View style={[styles.teamColorBar, { backgroundColor: tc.primary }]} />
          <Text style={[styles.teamCardTitle, { color: tc.primary }]}>
            {team.name}
          </Text>
          <Text style={[styles.teamTagline, { color: tc.accent }]}>
            "{team.tagline}"
          </Text>
        </View>
      )}

      {/* ── Stats ────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatBox label="Score" value={user.score.toLocaleString()} color={tc.primary} glow={tc.glow} />
        <StatBox label="Posters" value={user.postersContributed.toString()} color={tc.primary} glow={tc.glow} />
        <StatBox label="Vault" value={vaultCount.toString()} color={tc.primary} glow={tc.glow} />
      </View>

      {/* ── Actions ─────────────────────────────────────── */}
      <View style={styles.actions}>
        <Button
          label="🖼  Open Vault"
          onPress={() => router.push('/(main)/vault')}
          variant="secondary"
          fullWidth
        />
        <Button
          label="📷  Scan Poster"
          onPress={() => router.push('/scanner')}
          fullWidth
        />
        <Button
          label="Leave Arena"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          style={styles.logoutBtn}
        />
      </View>
    </ScreenContainer>
  );
}

function StatBox({
  label,
  value,
  color,
  glow,
}: {
  label: string;
  value: string;
  color: string;
  glow: string;
}) {
  return (
    <View style={[styles.statBox, { borderColor: color + '33', shadowColor: glow }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing[6],
    paddingBottom: Spacing[6],
    gap: Spacing[2],
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 4,          // square-ish — graffiti sticker aesthetic
    backgroundColor: Colors.bgCard,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    marginBottom: Spacing[2],
  },
  avatarText: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.black,
  },
  username: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  email: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.normal,
  },
  teamBadge: {
    marginTop: Spacing[1],
  },
  teamCard: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[6],
    gap: Spacing[1],
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  teamColorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  teamCardTitle: {
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginTop: Spacing[2],
  },
  teamTagline: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
    fontWeight: Typography.fontWeights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.sm,
    borderWidth: 1,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[1],
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeights.bold,
  },
  actions: {
    gap: Spacing[3],
  },
  logoutBtn: {
    marginTop: Spacing[4],
  },
});
