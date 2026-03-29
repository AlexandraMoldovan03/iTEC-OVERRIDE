/**
 * app/(main)/profile.tsx
 * Artist profile — badge echipă mare + butoane imagine pentru CTA.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/stores/authStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { TEAM_COLORS } from '../../src/theme/colors';
import { Colors, Spacing, Radius, Typography } from '../../src/theme';
import { TeamId } from '../../src/types/team';
import { getTeamById } from '../../src/constants/teams';
import {
  TEAM_BADGE_IMAGES,
  OPEN_VAULT_IMAGE,
  SCAN_POSTER_IMAGE,
} from '../../src/constants/badges';
const LEAVE_ARENA_IMAGE = require('../_layout/LeaveArena.png');
const TEAM_INITIALS: Record<string, string> = {
  minimalist: 'M', perfectionist: 'P', chaotic: 'C',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const vaultCount = useVaultStore((s) => s.posters.length);

  const [badgeErr, setBadgeErr]         = useState(false);
  const [vaultImgErr, setVaultImgErr]   = useState(false);
  const [scanImgErr, setScanImgErr]     = useState(false);

  if (!user) return null;

  const team = getTeamById(user.teamId);
  const tc   = TEAM_COLORS[user.teamId as TeamId];
  const badgeImg = TEAM_BADGE_IMAGES[user.teamId as TeamId];

  const handleLogout = () => {
    Alert.alert('Leave the arena?', 'You will be logged out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <ScreenContainer scrollable padded>

      {/* ── Artist Identity ─────────────────────────────── */}
      <View style={styles.heroSection}>

        {/* Badge echipă mare — înlocuiește avatarul cu litera */}
        <View style={[
          styles.badgeContainer,
          { shadowColor: tc.glow, shadowOpacity: 0.8, shadowRadius: 24 },
        ]}>
          {badgeErr ? (
            <View style={[styles.badgeFallback, {
              backgroundColor: tc.primary + '22',
              borderColor: tc.primary,
            }]}>
              <Text style={[styles.badgeFallbackText, { color: tc.primary }]}>
                {TEAM_INITIALS[user.teamId] ?? '?'}
              </Text>
            </View>
          ) : (
            <Image
              source={badgeImg}
              style={styles.badgeImage}
              resizeMode="contain"
              onError={() => setBadgeErr(true)}
              fadeDuration={150}
            />
          )}
        </View>

        <Text style={[styles.username, { color: tc.primary }]}>
          {user.username.toUpperCase()}
        </Text>
        <Text style={styles.email}>{user.email}</Text>

        {/* Tag echipă text sub email */}
        {team && (
          <View style={[
            styles.teamTag,
            {
              backgroundColor: tc.primary + '18',
              borderColor:     tc.primary,
              shadowColor:     tc.glow,
            },
          ]}>
            <Text style={[styles.teamTagText, { color: tc.primary }]}>
              {team.name.toUpperCase()}
            </Text>
            <Text style={[styles.teamTagline, { color: tc.accent }]}>
              "{team.tagline}"
            </Text>
          </View>
        )}
      </View>

      {/* ── Stats ────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatBox label="Score"   value={user.score.toLocaleString()}          color={tc.primary} glow={tc.glow} />
        <StatBox label="Posters" value={user.postersContributed.toString()}   color={tc.primary} glow={tc.glow} />
        <StatBox label="Vault"   value={vaultCount.toString()}                color={tc.primary} glow={tc.glow} />
      </View>

      {/* ── CTA imagine — Open Vault ─────────────────────── */}
      <TouchableOpacity
        style={styles.imageBtn}
        onPress={() => router.push('/(main)/vault')}
        activeOpacity={0.82}
      >
        {vaultImgErr ? (
          <View style={[styles.imageBtnFallback, { borderColor: '#00CFFF' }]}>
            <Text style={[styles.imageBtnFallbackText, { color: '#00CFFF' }]}>🖼  OPEN VAULT</Text>
          </View>
        ) : (
          <Image
            source={OPEN_VAULT_IMAGE}
            style={styles.imageBtnImg}
            resizeMode="contain"
            onError={() => setVaultImgErr(true)}
            fadeDuration={150}
          />
        )}
      </TouchableOpacity>

      {/* ── CTA imagine — Scan Poster ────────────────────── */}
      <TouchableOpacity
        style={styles.imageBtn}
        onPress={() => router.push('/scanner')}
        activeOpacity={0.82}
      >
        {scanImgErr ? (
          <View style={[styles.imageBtnFallback, { borderColor: '#FF1CF7' }]}>
            <Text style={[styles.imageBtnFallbackText, { color: '#FF1CF7' }]}>📷  SCAN POSTER</Text>
          </View>
        ) : (
          <Image
            source={SCAN_POSTER_IMAGE}
            style={styles.imageBtnImg}
            resizeMode="contain"
            onError={() => setScanImgErr(true)}
            fadeDuration={150}
          />
        )}
      </TouchableOpacity>

      {/* ── CTA imagine — LEAVE ARENA ────────────────────── */}
      <TouchableOpacity
      style={styles.imageBtn} // Keep your custom graffiti/image style
      onPress={handleLogout}  // Change this from router.push to your logout function
      activeOpacity={0.82}
      >
        {scanImgErr ? (
          <View style={[styles.imageBtnFallback, { borderColor: '#FF1CF7' }]}>
            <Text style={[styles.imageBtnFallbackText, { color: '#FF1CF7' }]}>📷  SCAN POSTER</Text>
          </View>
        ) : (
          <Image
            source={LEAVE_ARENA_IMAGE}
            style={styles.imageBtnImg}
            resizeMode="contain"
            onError={() => setScanImgErr(true)}
            fadeDuration={150}
          />
        )}
      </TouchableOpacity>



    </ScreenContainer>
  );
}

// ─── StatBox ──────────────────────────────────────────────────────────────────

function StatBox({
  label, value, color, glow,
}: {
  label: string; value: string; color: string; glow: string;
}) {
  return (
    <View style={[styles.statBox, { borderColor: color + '33', shadowColor: glow }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Stiluri ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  heroSection: {
    alignItems:    'center',
    paddingTop:    Spacing[6],
    paddingBottom: Spacing[5],
    gap:           Spacing[3],
  },

  // ── Badge mare ─────────────────────────────────────────────
  badgeContainer: {
    shadowOffset: { width: 0, height: 0 },
    elevation:    12,
    marginBottom: Spacing[1],
  },
  badgeImage: {
    width:  160,
    height: 160,
  },
  badgeFallback: {
    width:          160,
    height:         160,
    borderRadius:   80,
    borderWidth:    3,
    alignItems:     'center',
    justifyContent: 'center',
  },
  badgeFallbackText: {
    fontSize:   60,
    fontWeight: Typography.fontWeights.black,
  },

  // ── Identitate ─────────────────────────────────────────────
  username: {
    fontSize:      Typography.fontSizes['2xl'],
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  email: {
    fontSize:   Typography.fontSizes.sm,
    color:      Colors.textMuted,
    letterSpacing: Typography.letterSpacing.normal,
  },

  // ── Team tag ───────────────────────────────────────────────
  teamTag: {
    borderRadius:    Radius.sm,
    borderWidth:     1.5,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[5],
    alignItems:      'center',
    gap:             2,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.4,
    shadowRadius:    8,
    elevation:       4,
  },
  teamTagText: {
    fontSize:      Typography.fontSizes.base,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  teamTagline: {
    fontSize:   Typography.fontSizes.xs,
    fontStyle:  'italic',
    fontWeight: Typography.fontWeights.semibold,
  },

  // ── Stats ──────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap:           Spacing[3],
    marginBottom:  Spacing[5],
  },
  statBox: {
    flex:             1,
    backgroundColor:  Colors.bgCard,
    borderRadius:     Radius.sm,
    borderWidth:      1,
    padding:          Spacing[4],
    alignItems:       'center',
    gap:              Spacing[1],
    shadowOpacity:    0.25,
    shadowRadius:     8,
    shadowOffset:     { width: 0, height: 0 },
    elevation:        4,
  },
  statValue: {
    fontSize:   Typography.fontSizes.xl,
    fontWeight: Typography.fontWeights.black,
  },
  statLabel: {
    fontSize:      Typography.fontSizes.xs,
    color:         Colors.textMuted,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    fontWeight:    Typography.fontWeights.bold,
  },

  // ── Butoane imagine ────────────────────────────────────────
  imageBtn: {
    width:         '100%',
    marginBottom:  Spacing[0],
    shadowColor:   '#FFFFFF',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius:  10,
    elevation:     4,
  },
  imageBtnImg: {
    width:  '100%',
    height: 150,
  },
  imageBtnFallback: {
    width:           '100%',
    height:          90,
    borderRadius:    Radius.sm,
    borderWidth:     2,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#0A0A0A',
  },
  imageBtnFallbackText: {
    fontSize:      Typography.fontSizes.lg,
    fontWeight:    Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },

  // ── Logout ─────────────────────────────────────────────────
  logoutWrap: {
    marginTop:    Spacing[4],
    marginBottom: Spacing[8],
  },
});
