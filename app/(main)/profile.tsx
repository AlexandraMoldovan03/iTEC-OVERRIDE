/**
 * app/(main)/profile.tsx
 * User profile screen. Shows stats, team affiliation, and settings.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
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
      { text: 'Log out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScreenContainer scrollable padded>
      {/* Avatar & identity */}
      <View style={styles.heroSection}>
        <View style={[styles.avatar, { borderColor: tc.primary, shadowColor: tc.primary }]}>
          <Text style={styles.avatarText}>{user.username[0].toUpperCase()}</Text>
        </View>
        <Text style={[styles.username, { color: tc.primary }]}>{user.username}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <TeamBadge teamId={user.teamId} style={styles.teamBadge} />
      </View>

      {/* Team flavour */}
      {team && (
        <View style={[styles.teamCard, { borderColor: tc.primary + '55', backgroundColor: tc.primary + '11' }]}>
          <Text style={[styles.teamCardTitle, { color: tc.primary }]}>{team.name}</Text>
          <Text style={[styles.teamTagline, { color: tc.accent }]}>&ldquo;{team.tagline}&rdquo;</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Score" value={user.score.toLocaleString()} color={tc.primary} />
        <StatBox label="Posters" value={user.postersContributed.toString()} color={tc.primary} />
        <StatBox label="Vault" value={vaultCount.toString()} color={tc.primary} />
      </View>

      {/* Actions */}
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

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
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
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.bgCard,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: Spacing[2],
  },
  avatarText: {
    fontSize: Typography.fontSizes['3xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
  },
  username: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },
  email: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
  },
  teamBadge: {
    marginTop: Spacing[1],
  },
  teamCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[6],
    gap: Spacing[1],
    alignItems: 'center',
  },
  teamCardTitle: {
    fontSize: Typography.fontSizes.lg,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  teamTagline: {
    fontSize: Typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginBottom: Spacing[6],
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    alignItems: 'center',
    gap: Spacing[1],
  },
  statValue: {
    fontSize: Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
  },
  statLabel: {
    fontSize: Typography.fontSizes.xs,
    color: Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  actions: {
    gap: Spacing[3],
  },
  logoutBtn: {
    marginTop: Spacing[4],
  },
});
