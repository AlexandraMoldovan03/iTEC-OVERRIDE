/**
 * app/poster/[id].tsx
 * Camera poster — arena de battle live.
 *
 * SCAN GATE: Un utilizator poate deschide un poster DOAR dacă l-a scanat
 * în prealabil (are o înregistrare matched=true în poster_scans).
 * Dacă nu → ecran "Scan this poster first" cu buton către scanner.
 *
 * Layout după gate:
 *   [HUD top: poster name + utilizatori online + status live]
 *   [PosterAnchorView — imaginea reală ca canvas + SVG mural overlay]
 *   [Territory panel — colapsabil]
 *   [Tool options row: color picker / sticker picker]
 *   [Bottom toolbar: mural tools]
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Image,
  Vibration,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { usePosterRoom } from '../../src/hooks/usePosterRoom';
import { useMuralToolStore } from '../../src/stores/muralToolStore';
import { useVaultStore } from '../../src/stores/vaultStore';
import { useAuthStore } from '../../src/stores/authStore';
import { usePosterStore } from '../../src/stores/posterStore';
import { posterService } from '../../src/services/posterService';

import { PosterAnchorView } from '../../src/components/poster/PosterAnchorView';
import { TerritoryPanel } from '../../src/components/poster/TerritoryPanel';
import { LeaderboardPanel } from '../../src/components/poster/LeaderboardPanel';
import { LeaderAlert } from '../../src/components/poster/LeaderAlert';
import { MuralToolbar } from '../../src/components/mural/MuralToolbar';
import { ColorPicker } from '../../src/components/mural/ColorPicker';
import { StickerPicker } from '../../src/components/mural/StickerPicker';
import { LiveIndicator } from '../../src/components/ui/LiveIndicator';
import { Button } from '../../src/components/ui/Button';

import { Colors, Spacing, Typography } from '../../src/theme';
import { TEAM_COLORS } from '../../src/theme/colors';
import { TeamId } from '../../src/types/team';
import { OnlineUser } from '../../src/services/wsService';
import { TEAM_BADGE_IMAGES } from '../../src/constants/badges';

// ─── Assets alertă ────────────────────────────────────────────────────────────

const CAT_ALERT_1 = require('../_layout/cat1.png');
const CAT_ALERT_2 = require('../_layout/cat2.png');

// ─── Avatar utilizator online ─────────────────────────────────────────────────

const TEAM_INITIALS: Record<string, string> = {
  minimalist: 'M',
  perfectionist: 'P',
  chaotic: 'C',
};

function UserAvatar({ user }: { user: OnlineUser }) {
  const tc = TEAM_COLORS[user.teamId as TeamId];
  const badgeImg = TEAM_BADGE_IMAGES[user.teamId as TeamId];
  const [imgErr, setImgErr] = React.useState(false);

  return (
    <View
      style={[
        styles.avatar,
        {
          backgroundColor: tc.primary + '15',
          borderColor: tc.primary,
          shadowColor: tc.glow,
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

// ─── Scan gate screen ─────────────────────────────────────────────────────────

function ScanGateScreen({ onScan, onBack }: { onScan: () => void; onBack: () => void }) {
  return (
    <View style={styles.gateScreen}>
      <TouchableOpacity onPress={onBack} style={styles.gateBack} hitSlop={12}>
        <Text style={styles.gateBackText}>← Back</Text>
      </TouchableOpacity>

      <View style={styles.gateContent}>
        <Text style={styles.gateIcon}>🔒</Text>
        <Text style={styles.gateTitle}>Scan this poster{'\n'}to unlock it</Text>
        <Text style={styles.gateDesc}>
          Find the real-world poster and scan it with your camera to enter this battle room.
        </Text>
        <Button
          label="Open Scanner"
          onPress={onScan}
          style={styles.gateBtn}
        />
        <TouchableOpacity onPress={onBack} style={styles.gateCancel}>
          <Text style={styles.gateCancelText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Ecran principal ──────────────────────────────────────────────────────────

type GateState = 'checking' | 'granted' | 'denied';

export default function PosterRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const vaultStore = useVaultStore();

  const [gateState, setGateState] = useState<GateState>('checking');

  useEffect(() => {
    if (!user?.id || !id) {
      setGateState('denied');
      return;
    }

    if (vaultStore.hasScanned(id)) {
      setGateState('granted');
      return;
    }

    let cancelled = false;

    posterService.hasUserScannedPoster(user.id, id).then((scanned) => {
      if (cancelled) return;
      setGateState(scanned ? 'granted' : 'denied');
    });

    return () => {
      cancelled = true;
    };
  }, [id, user?.id, vaultStore]);

  if (gateState === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentPurple} size="large" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (gateState === 'denied') {
    return (
      <ScanGateScreen
        onScan={() => router.replace('/scanner')}
        onBack={() => router.back()}
      />
    );
  }

  return <BattleRoom id={id} />;
}

// ─── Battle room ──────────────────────────────────────────────────────────────

function BattleRoom({ id }: { id: string }) {
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
  const user = useAuthStore((s) => s.user);

  const playerScores = usePosterStore((s) => s.playerScores);
  const teamScores = usePosterStore((s) => s.teamScores);

  const [showLostLeadAlert, setShowLostLeadAlert] = useState(false);
  const [catVariant, setCatVariant] = useState<1 | 2>(1);
  const [alertText, setAlertText] = useState('Someone just passed you and took 1st place.');

  const prevLeaderUserIdRef = useRef<string | null>(null);
  const prevLeaderTeamIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLeaderPlayer = playerScores[0] ?? null;
  const currentLeaderUserId = currentLeaderPlayer?.userId ?? null;

  const currentLeaderTeam = teamScores[0] ?? null;
  const currentLeaderTeamId = currentLeaderTeam?.teamId ?? null;

  const myUserId = user?.id ?? null;
  const myTeamId = (user?.teamId as TeamId | undefined) ?? null;

  const triggerLeadLostAlert = (message: string) => {
    setCatVariant((v) => (v === 1 ? 2 : 1));
    setAlertText(message);
    setShowLostLeadAlert(true);

    Vibration.vibrate([0, 140, 90, 180]);

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }

    alertTimerRef.current = setTimeout(() => {
      setShowLostLeadAlert(false);
    }, 2600);
  };

  useEffect(() => {
    if (!myUserId || !currentLeaderUserId) {
      prevLeaderUserIdRef.current = currentLeaderUserId;
      return;
    }

    const prevLeaderUserId = prevLeaderUserIdRef.current;

    const iLostPlayerLead =
      prevLeaderUserId === myUserId &&
      currentLeaderUserId !== myUserId &&
      currentLeaderUserId !== prevLeaderUserId;

    if (iLostPlayerLead) {
      triggerLeadLostAlert('Someone just passed you and took 1st place.');
    }

    prevLeaderUserIdRef.current = currentLeaderUserId;
  }, [currentLeaderUserId, myUserId]);

  useEffect(() => {
    if (!myTeamId || !currentLeaderTeamId) {
      prevLeaderTeamIdRef.current = currentLeaderTeamId;
      return;
    }

    const prevLeaderTeamId = prevLeaderTeamIdRef.current;

    const myTeamLostLead =
      prevLeaderTeamId === myTeamId &&
      currentLeaderTeamId !== myTeamId &&
      currentLeaderTeamId !== prevLeaderTeamId;

    if (myTeamLostLead) {
      triggerLeadLostAlert('Sorry... your team just lost 1st place.');
    }

    prevLeaderTeamIdRef.current = currentLeaderTeamId;
  }, [currentLeaderTeamId, myTeamId]);

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
        alertTimerRef.current = null;
      }
      Vibration.cancel();
    };
  }, []);

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

  const visibleUsers = onlineUsers.slice(0, 5);
  const extraCount = Math.max(0, onlineUsers.length - 5);

  return (
    <View style={styles.screen}>
      <LeaderAlert
        visible={showLostLeadAlert}
        imageSource={catVariant === 1 ? CAT_ALERT_1 : CAT_ALERT_2}
        title="Sorry..."
        subtitle={alertText}
      />

      <View style={styles.hud}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hudClose}>
          <Text style={styles.hudCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle} numberOfLines={1}>
            {poster.name}
          </Text>
        </View>
        <LiveIndicator connected={wsConnected} style={styles.liveIndicator} />
      </View>

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

      <PosterAnchorView poster={poster} layers={isLoadingLayers ? [] : layers} />

      <View style={styles.panelWrap}>
        <LeaderboardPanel myTeamId={myTeamId} />
        <TerritoryPanel
          territory={poster.territory}
          wsConnected={wsConnected}
          recentContributorUsernames={onlineUsers.map((u) => u.username)}
        />
      </View>

      <View style={styles.toolOptions}>
        {(activeTool === 'brush' || activeTool === 'spray' || activeTool === 'glow') && (
          <ColorPicker />
        )}
        {activeTool === 'sticker' && <StickerPicker />}
      </View>

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
  backBtn: {
    marginTop: Spacing[3],
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.base,
  },

  gateScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 56,
    paddingHorizontal: Spacing[5],
  },
  gateBack: {
    marginBottom: Spacing[4],
  },
  gateBackText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.base,
  },
  gateContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
    paddingBottom: Spacing[16],
  },
  gateIcon: {
    fontSize: 56,
  },
  gateTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.wide,
    lineHeight: Typography.fontSizes['2xl'] * 1.3,
  },
  gateDesc: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.base * 1.6,
    maxWidth: 280,
  },
  gateBtn: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[8],
  },
  gateCancel: {
    paddingVertical: Spacing[2],
  },
  gateCancelText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },

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
  hudCenter: {
    flex: 1,
  },
  hudTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  liveIndicator: {
    flexShrink: 0,
  },

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
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    overflow: 'hidden',
  },
  avatarBadge: {
    width: 34,
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

  panelWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  toolOptions: {
    minHeight: 0,
  },
});