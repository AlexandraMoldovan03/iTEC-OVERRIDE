/**
 * app/poster/[id].tsx
 * Camera poster — arena de battle live.
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
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';

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
import { SwordBattleIntro } from '../../src/components/poster/SwordBattleIntro';
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

const { width } = Dimensions.get('window');

// ─── Assets ────────────────────────────────────────────────────────────
const CAT_ALERT_1    = require('../_layout/cat1.png');
const CAT_ALERT_2    = require('../_layout/cat2.png');
const SWORD_BATTLE   = require('../_layout/Sword Battle.json');
const SWORD_SOUND    = require('../_layout/sword.mp3');

const TEAM_INITIALS: Record<string, string> = {
  minimalist: 'M',
  perfectionist: 'P',
  chaotic: 'C',
};

// ─── Sub-Components ───────────────────────────────────────────────────

function UserAvatar({ user }: { user: OnlineUser }) {
  const tc = TEAM_COLORS[user.teamId as TeamId];
  const badgeImg = TEAM_BADGE_IMAGES[user.teamId as TeamId];
  const [imgErr, setImgErr] = useState(false);

  return (
    <View style={[styles.avatar, { backgroundColor: tc.primary + '15', borderColor: tc.primary, shadowColor: tc.glow }]}>
      {imgErr ? (
        <Text style={{ color: tc.primary, fontSize: 13, fontWeight: '900' }}>{TEAM_INITIALS[user.teamId] ?? '?'}</Text>
      ) : (
        <Image source={badgeImg} style={styles.avatarBadge} resizeMode="contain" onError={() => setImgErr(true)} />
      )}
    </View>
  );
}

function ScanGateScreen({ onScan, onBack }: { onScan: () => void; onBack: () => void }) {
  return (
    <View style={styles.gateScreen}>
      <TouchableOpacity onPress={onBack} style={styles.gateBack} hitSlop={12}><Text style={styles.gateBackText}>← Back</Text></TouchableOpacity>
      <View style={styles.gateContent}>
        <Text style={styles.gateIcon}>🔒</Text>
        <Text style={styles.gateTitle}>Scan this poster{'\n'}to unlock it</Text>
        <Text style={styles.gateDesc}>Find the real-world poster and scan it with your camera to enter this battle room.</Text>
        <Button label="Open Scanner" onPress={onScan} style={styles.gateBtn} />
        <TouchableOpacity onPress={onBack} style={styles.gateCancel}><Text style={styles.gateCancelText}>Not now</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen Logic ────────────────────────────────────────────────

type GateState = 'checking' | 'granted' | 'denied';

export default function PosterRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const vaultStore = useVaultStore();
  const [gateState, setGateState] = useState<GateState>('checking');

  useEffect(() => {
    if (!user?.id || !id) { setGateState('denied'); return; }
    if (vaultStore.hasScanned(id)) { setGateState('granted'); return; }
    let cancelled = false;
    posterService.hasUserScannedPoster(user.id, id).then((scanned) => {
      if (cancelled) return;
      setGateState(scanned ? 'granted' : 'denied');
    });
    return () => { cancelled = true; };
  }, [id, user?.id]);

  if (gateState === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.accentPurple} size="large" />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  if (gateState === 'denied') {
    return <ScanGateScreen onScan={() => router.replace('/scanner')} onBack={() => router.back()} />;
  }

  return <BattleRoom id={id} />;
}

// ─── Battle Room Component ───────────────────────────────────────────

function BattleRoom({ id }: { id: string }) {
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const swordSoundRef = useRef<Audio.Sound | null>(null);

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
  const myTeamId = (user?.teamId as TeamId | undefined) ?? null;

  // Audio effect for the intro sequence
  useEffect(() => {
    let isMounted = true;

    async function playIntroSfx() {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, shouldDuckAndroid: true });
        const { sound } = await Audio.Sound.createAsync(SWORD_SOUND);
        if (isMounted) {
          swordSoundRef.current = sound;
          await sound.playAsync();
        }
      } catch (err) {
        console.log('Audio playback error:', err);
      }
    }

    if (showIntro) playIntroSfx();

    return () => {
      isMounted = false;
      if (swordSoundRef.current) {
        swordSoundRef.current.unloadAsync();
      }
    };
  }, []);

  if (error) return <View style={styles.center}><Text style={styles.errorText}>⚠️ {error}</Text></View>;
  if (isLoadingPoster || !poster) {
    return <View style={styles.center}><ActivityIndicator color={Colors.accentPurple} size="large" /><Text style={styles.loadingText}>Entering battle...</Text></View>;
  }

  return (
    <View style={styles.screen}>
      {/* 1. HUD Top */}
      <View style={styles.hud}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hudClose}>
          <Text style={styles.hudCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle} numberOfLines={1}>{poster.name}</Text>
        </View>
        <LiveIndicator connected={wsConnected} />
      </View>

      {/* 2. Main Canvas */}
      <PosterAnchorView poster={poster} layers={isLoadingLayers ? [] : layers} />

      {/* 3. Stats & Territory */}
      <View style={styles.panelWrap}>
        <LeaderboardPanel myTeamId={myTeamId} />
        <TerritoryPanel territory={poster.territory} wsConnected={wsConnected} />
      </View>

      {/* 4. Tools */}
      <View style={styles.toolOptions}>
        {(activeTool === 'brush' || activeTool === 'spray' || activeTool === 'glow') && <ColorPicker />}
        {activeTool === 'sticker' && <StickerPicker />}
      </View>
      <MuralToolbar />

      {/* 5. Intro Animation Overlay (Z-INDEXED) */}
      {showIntro && (
        <View style={styles.introOverlay}>
          <SwordBattleIntro
            source={SWORD_BATTLE}
            onDone={() => setShowIntro(false)}
          />
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase' },
  errorText: { color: Colors.error, textAlign: 'center', padding: 20 },
  
  // Intro Sync Styles
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 9999, // Ensure it sits above all components
    justifyContent: 'center',
    alignItems: 'center',
  },

  hud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  hudClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  hudCloseText: { color: Colors.textMuted, fontSize: 18 },
  hudCenter: { flex: 1 },
  hudTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
  
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarBadge: { width: 34, height: 34 },
  
  gateScreen: { flex: 1, backgroundColor: Colors.bg, paddingTop: 56, paddingHorizontal: 20 },
  gateBackText: { color: Colors.textSecondary, fontSize: 16 },
  gateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  gateIcon: { fontSize: 56 },
  gateTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center' },
  gateDesc: { color: '#888', textAlign: 'center', lineHeight: 22 },
  gateBtn: { marginTop: 8 },
  gateCancelText: { color: '#555', fontSize: 14, marginTop: 12 },

  panelWrap: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  toolOptions: { minHeight: 0 },
});