/**
 * app/poster/[id].tsx
 * Camera poster — arena de battle live.
 *
 * Layout:
 *   [HUD top: poster name + utilizatori online + status live]
 *   [Poster anchor view cu mural canvas overlay]
 *   [Territory panel — colapsabil]
 *   [Tool options row: color picker / sticker picker]
 *   [Bottom toolbar: mural tools]
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePosterRoom } from '../../src/hooks/usePosterRoom';
import { useMuralToolStore } from '../../src/stores/muralToolStore';
import { PosterAnchorView } from '../../src/components/poster/PosterAnchorView';
import { TerritoryPanel } from '../../src/components/poster/TerritoryPanel';
import { MuralToolbar } from '../../src/components/mural/MuralToolbar';
import { ColorPicker } from '../../src/components/mural/ColorPicker';
import { StickerPicker } from '../../src/components/mural/StickerPicker';
import { LiveIndicator } from '../../src/components/ui/LiveIndicator';
import { LeaderboardPanel } from '../../src/components/poster/LeaderboardPanel';
import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import { TEAM_COLORS } from '../../src/theme/colors';
import { TeamId } from '../../src/types/team';
import { OnlineUser } from '../../src/services/wsService';
import { Image } from 'react-native';
import { TEAM_BADGE_IMAGES } from '../../src/constants/badges';

// ─── Avatar utilizator online (cu badge imagine mic + fallback) ───────────────

const TEAM_INITIALS: Record<string, string> = {
  minimalist: 'M', perfectionist: 'P', chaotic: 'C',
};

function UserAvatar({ user }: { user: OnlineUser }) {
  const tc       = TEAM_COLORS[user.teamId as TeamId];
  const badgeImg = TEAM_BADGE_IMAGES[user.teamId as TeamId];
  const [imgErr, setImgErr] = React.useState(false);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: tc.primary + '15',
          borderColor:     tc.primary,
          shadowColor:     tc.glow,
        },
      ]}
    >
      {imgErr ? (
        <Text style={{ color: tc.primary, fontSize: 13, fontWeight: '900' }}>
          {TEAM_INITIALS[user.teamId] ?? '?'}
        </Text>
      ) : (
        <Image
          source={badgeImg}
          style={styles.avatarBadge}
          resizeMode="contain"
          onError={() => setImgErr(true)}
          fadeDuration={100}
        />
      )}
    </View>
  );
}

// ─── Ecran principal ──────────────────────────────────────────────────────────

export default function PosterRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    poster,
    layers,
    isLoadingPoster,
    isLoadingLayers,
    wsConnected,
    onlineUsers,
    error,
  } = usePosterRoom(id);

  const activeTool = useMuralToolStore((s) => s.activeTool);

  // ── Stări de eroare / loading ─────────────────────────────

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoadingPoster || !poster) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentPurple} size="large" />
        <Text style={styles.loadingText}>Entering battle room...</Text>
      </View>
    );
  }

  // Maxim 5 avatare în HUD, restul afișat ca "+N"
  const visibleUsers = onlineUsers.slice(0, 5);
  const extraCount   = Math.max(0, onlineUsers.length - 5);

  return (
    <View style={styles.screen}>

      {/* ── HUD top ──────────────────────────────────────── */}
      <View style={styles.hud}>

        {/* Buton închidere */}
        <TouchableOpacity onPress={() => router.back()} style={styles.hudClose}>
          <Text style={styles.hudCloseText}>✕</Text>
        </TouchableOpacity>

        {/* Titlu poster */}
        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle} numberOfLines={1}>{poster.name}</Text>
        </View>

        {/* Status live */}
        <LiveIndicator connected={wsConnected} style={styles.liveIndicator} />
      </View>

      {/* ── Bandă de utilizatori online ──────────────────── */}
      {onlineUsers.length > 0 && (
        <View style={styles.presenceBand}>
          <Text style={styles.presenceLabel}>ONLINE NOW</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarRow}
          >
            {visibleUsers.map((u) => (
              <View key={u.userId} style={styles.avatarWrap}>
                <UserAvatar user={u} />
                <Text style={styles.avatarName} numberOfLines={1}>
                  {u.username}
                </Text>
              </View>
            ))}

            {extraCount > 0 && (
              <View style={[styles.avatar, styles.avatarExtra]}>
                <Text style={styles.avatarExtraText}>+{extraCount}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Poster + mural canvas ────────────────────────── */}
      <PosterAnchorView poster={poster} layers={isLoadingLayers ? [] : layers} />

      {/* ── Panels scrollabili ────────────────────────────── */}
      <View style={styles.panelWrap}>
        {/* Clasament în timp real */}
        <LeaderboardPanel />

        {/* Territory panel */}
        <TerritoryPanel
          territory={poster.territory}
          wsConnected={wsConnected}
          recentContributorUsernames={onlineUsers.map((u) => u.username)}
        />
      </View>

      {/* ── Tool options — contextual ────────────────────── */}
      <View style={styles.toolOptions}>
        {(activeTool === 'brush' || activeTool === 'spray' || activeTool === 'glow') && (
          <ColorPicker />
        )}
        {activeTool === 'sticker' && <StickerPicker />}
      </View>

      {/* ── Toolbar desen ────────────────────────────────── */}
      <MuralToolbar />
    </View>
  );
}

// ─── Stiluri ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.fontSizes.base,
    textAlign: 'center',
    paddingHorizontal: Spacing[6],
  },
  backBtn: { marginTop: Spacing[3] },
  backText: { color: Colors.textSecondary, fontSize: Typography.fontSizes.base },

  // ── HUD ──────────────────────────────────────────────────
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: 52,
    paddingBottom: Spacing[2],
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[3],
  },
  hudClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudCloseText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.lg,
  },
  hudCenter: { flex: 1 },
  hudTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  liveIndicator: { flexShrink: 0 },

  // ── Presence band ─────────────────────────────────────────
  presenceBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing[3],
  },
  presenceLabel: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.accentGreen,
    letterSpacing: Typography.letterSpacing.widest,
    flexShrink: 0,
    // Punctul pulsant de "live"
    textShadowColor: Colors.accentGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    alignItems: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    gap: 2,
  },
  avatar: {
    width:          36,
    height:         36,
    borderRadius:   18,           // circular — badge rotund
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    shadowOpacity:  0.6,
    shadowRadius:   6,
    shadowOffset:   { width: 0, height: 0 },
    elevation:      4,
    overflow:       'hidden',
  },
  avatarBadge: {
    width:  34,
    height: 34,
  },
  avatarName: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: Typography.fontWeights.bold,
    letterSpacing: 0.5,
    maxWidth: 36,
    textAlign: 'center',
  },
  avatarExtra: {
    backgroundColor: Colors.bgCard,
    borderColor: Colors.borderBright,
    borderWidth: 1.5,
  },
  avatarExtraText: {
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color: Colors.textMuted,
  },

  // ── Restul ───────────────────────────────────────────────
  panelWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  toolOptions: { minHeight: 0 },
});
