/**
 * app/poster/[id].tsx
 * Camera poster — arena de battle live.
 *
 * Added:
 * - live voice notes per poster room
 * - hold-to-record / release-to-send
 * - upload to Supabase Storage
 * - realtime sync from voice_messages
 * - vertical scroll for poster content
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

import {
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from 'expo-audio';

import { supabase } from '../../src/lib/supabase';
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

import { Colors, Spacing, Typography, Radius } from '../../src/theme';
import { TEAM_COLORS } from '../../src/theme/colors';
import { TeamId } from '../../src/types/team';
import { OnlineUser } from '../../src/services/wsService';
import { TEAM_BADGE_IMAGES } from '../../src/constants/badges';

// ─── Assets ───────────────────────────────────────────────────────────────────

const CAT_ALERT_1 = require('../_layout/cat1.png');
const CAT_ALERT_2 = require('../_layout/cat2.png');
const SWORD_BATTLE = require('../_layout/Sword Battle.json');

// ─── Voice constants ──────────────────────────────────────────────────────────

const VOICE_BUCKET = 'poster-voice';
const MAX_VOICE_SECONDS = 15;
const TOOLBAR_BOTTOM_SPACE = 120;

// ─── Voice types/helpers ──────────────────────────────────────────────────────

type VoiceMessage = {
  id: string;
  poster_id: string;
  sender_id: string;
  sender_username: string;
  storage_path: string;
  duration_ms: number;
  created_at: string;
  signed_url?: string | null;
};

function formatVoiceDuration(ms: number) {
  const totalSec = Math.max(1, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

async function buildSignedVoiceUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  if (error) return null;
  return data?.signedUrl ?? null;
}

async function fetchVoiceMessagesForPoster(posterId: string): Promise<VoiceMessage[]> {
  const { data, error } = await supabase
    .from('voice_messages')
    .select('*')
    .eq('poster_id', posterId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];

  const withUrls = await Promise.all(
    data.map(async (row) => ({
      ...row,
      signed_url: await buildSignedVoiceUrl(row.storage_path),
    }))
  );

  return withUrls;
}

async function uploadVoiceMessage(params: {
  posterId: string;
  senderId: string;
  senderUsername: string;
  fileUri: string;
  durationMs: number;
}) {
  const { posterId, senderId, senderUsername, fileUri, durationMs } = params;

  const fileExt = fileUri.split('.').pop() || 'm4a';
  const fileName = `${Date.now()}.${fileExt}`;
  const storagePath = `${posterId}/${senderId}/${fileName}`;

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(storagePath, blob, {
      contentType: 'audio/mp4',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase
    .from('voice_messages')
    .insert({
      poster_id: posterId,
      sender_id: senderId,
      sender_username: senderUsername,
      storage_path: storagePath,
      duration_ms: durationMs,
    });

  if (insertError) throw insertError;
}

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

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [showIntro, setShowIntro] = useState(true);
  const [showLostLeadAlert, setShowLostLeadAlert] = useState(false);
  const [catVariant, setCatVariant] = useState<1 | 2>(1);
  const [alertText, setAlertText] = useState('Someone just passed you and took 1st place.');

  const [voiceMessages, setVoiceMessages] = useState<VoiceMessage[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceSending, setVoiceSending] = useState(false);
  const [recordingHeld, setRecordingHeld] = useState(false);

  const prevLeaderUserIdRef = useRef<string | null>(null);
  const prevLeaderTeamIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePlayerRef = useRef<any>(null);

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

  const stopActivePlayback = () => {
    if (activePlayerRef.current) {
      try {
        activePlayerRef.current.pause();
      } catch {}
      try {
        activePlayerRef.current.remove();
      } catch {}
      activePlayerRef.current = null;
    }
  };

  const playVoiceNote = async (msg: VoiceMessage) => {
    if (!msg.signed_url) return;

    try {
      stopActivePlayback();
      const player = createAudioPlayer(msg.signed_url);
      activePlayerRef.current = player;
      player.play();
    } catch (e) {
      console.warn('[voice] play error', e);
    }
  };

  const loadVoiceMessages = useCallback(async () => {
    try {
      setVoiceLoading(true);
      const rows = await fetchVoiceMessagesForPoster(id);
      setVoiceMessages(rows);
    } finally {
      setVoiceLoading(false);
    }
  }, [id]);

  const startVoiceRecording = useCallback(async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.warn('[voice] microphone permission denied');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: MAX_VOICE_SECONDS });
      setRecordingHeld(true);
      Vibration.vibrate(35);
    } catch (e) {
      console.warn('[voice] start record error', e);
      setRecordingHeld(false);
    }
  }, [recorder]);

  const stopVoiceRecordingAndSend = useCallback(async () => {
    if (!recordingHeld) return;

    try {
      setRecordingHeld(false);

      if (!recorderState.isRecording) {
        return;
      }

      await recorder.stop();

      const fileUri = recorder.uri ?? recorderState.url ?? null;
      const durationMs = recorderState.durationMillis ?? 0;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!fileUri || durationMs < 400 || !user?.id || !user?.username) {
        return;
      }

      setVoiceSending(true);

      await uploadVoiceMessage({
        posterId: id,
        senderId: user.id,
        senderUsername: user.username,
        fileUri,
        durationMs,
      });

      await loadVoiceMessages();
      Vibration.vibrate(30);
    } catch (e) {
      console.warn('[voice] stop/send error', e);
    } finally {
      setVoiceSending(false);
    }
  }, [
    recordingHeld,
    recorder,
    recorderState.isRecording,
    recorderState.durationMillis,
    recorderState.url,
    user?.id,
    user?.username,
    id,
    loadVoiceMessages,
  ]);

  useEffect(() => {
    loadVoiceMessages();
  }, [loadVoiceMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`voice_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_messages',
          filter: `poster_id=eq.${id}`,
        },
        async () => {
          await loadVoiceMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopActivePlayback();
    };
  }, [id, loadVoiceMessages]);

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
      stopActivePlayback();
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
      {showIntro && (
        <SwordBattleIntro
          source={SWORD_BATTLE}
          onDone={() => setShowIntro(false)}
        />
      )}

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

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={styles.voicePanel}>
          <View style={styles.voiceHeader}>
            <Text style={styles.voiceTitle}>LIVE VOICE</Text>
            <Text style={styles.voiceHint}>Hold to record • release to send</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.voiceRecordBtn,
              recordingHeld && styles.voiceRecordBtnActive,
            ]}
            onPressIn={startVoiceRecording}
            onPressOut={stopVoiceRecordingAndSend}
            disabled={voiceSending}
          >
            <Text style={styles.voiceRecordBtnText}>
              {voiceSending
                ? 'SENDING...'
                : recordingHeld
                ? 'RECORDING... RELEASE TO SEND'
                : 'HOLD TO TALK'}
            </Text>
          </TouchableOpacity>

          {voiceLoading ? (
            <ActivityIndicator color={Colors.accentCyan} style={{ marginTop: 10 }} />
          ) : voiceMessages.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.voiceList}
            >
              {voiceMessages.map((msg) => {
                const mine = msg.sender_id === user?.id;
                return (
                  <TouchableOpacity
                    key={msg.id}
                    style={[
                      styles.voiceChip,
                      mine && styles.voiceChipMine,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => playVoiceNote(msg)}
                  >
                    <Text style={styles.voiceChipUser} numberOfLines={1}>
                      {mine ? 'YOU' : msg.sender_username}
                    </Text>
                    <Text style={styles.voiceChipMeta}>
                      ▶ {formatVoiceDuration(msg.duration_ms)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.voiceEmpty}>
              No voice notes yet on this poster.
            </Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

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

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 0,
  },

  panelWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  toolOptions: {
    minHeight: 0,
    paddingHorizontal: Spacing[4],
  },

  voicePanel: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
    gap: Spacing[2],
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceTitle: {
    color: Colors.accentCyan,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },
  voiceHint: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
  },
  voiceRecordBtn: {
    backgroundColor: '#10232a',
    borderWidth: 1,
    borderColor: Colors.accentCyan,
    borderRadius: 999,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceRecordBtnActive: {
    backgroundColor: '#35101b',
    borderColor: Colors.accentPink,
  },
  voiceRecordBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },
  voiceList: {
    gap: Spacing[2],
    paddingTop: Spacing[1],
  },
  voiceChip: {
    minWidth: 120,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  voiceChipMine: {
    borderColor: Colors.accentCyan,
    backgroundColor: 'rgba(0,229,255,0.08)',
  },
  voiceChipUser: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    marginBottom: 2,
  },
  voiceChipMeta: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.xs,
  },
  voiceEmpty: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    marginTop: Spacing[1],
  },

  bottomSpacer: {
    height: TOOLBAR_BOTTOM_SPACE,
  },
});