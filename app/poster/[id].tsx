/**
 * app/poster/[id].tsx
 * Camera poster — arena de battle live.
 *
 * Features:
 * - live voice notes per poster room
 * - hold-to-record / release-to-send
 * - upload to Supabase Storage
 * - realtime sync from voice_messages
 * - poster stays fixed (no scroll over drawing area)
 * - lower content is scrollable
 * - autoplay for incoming voice notes
 * - sender does NOT auto-hear own voice note
 * - live pulse messages (vibration patterns) per poster room
 * - pulse is broadcast to ALL other users on the same poster
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
import { RainbowCatPopup } from '../../src/components/poster/RainbowCatPopup';
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

const CAT_ALERT_1 = require('../_layout/cat1.png');
const CAT_ALERT_2 = require('../_layout/cat2.png');
const SWORD_BATTLE = require('../_layout/Sword Battle.json');
const BLACK_RAINBOW_CAT = require('../_layout/black rainbow cat.json');

const VOICE_BUCKET = 'poster-voice';
const MAX_VOICE_SECONDS = 15;
const TOOLBAR_BOTTOM_SPACE = 140;

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

type VibrationMessage = {
  id: string;
  poster_id: string;
  sender_id: string;
  sender_username: string;
  pattern: number[];
  total_duration_ms: number;
  created_at: string;
};

function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(num, max));
}

function buildSignedVoiceUrl(storagePath: string) {
  return supabase.storage
    .from(VOICE_BUCKET)
    .createSignedUrl(storagePath, 60 * 60)
    .then(({ data, error }) => (error ? null : (data?.signedUrl ?? null)));
}

function buildPulsePatternFromHold(durationMs: number): number[] {
  const safeDuration = clamp(durationMs, 250, 5000);
  const chunkCount = clamp(Math.round(safeDuration / 180), 3, 18);
  const pattern: number[] = [0];

  for (let i = 0; i < chunkCount; i += 1) {
    const vib = 50 + ((i * 37) % 90);
    const pause = 35 + ((i * 19) % 70);
    pattern.push(vib, pause);
  }

  return pattern;
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

async function insertVibrationMessage(params: {
  posterId: string;
  senderId: string;
  senderUsername: string;
  pattern: number[];
}) {
  const totalDurationMs = params.pattern.reduce((sum, val) => sum + val, 0);

  const { error } = await supabase
    .from('vibration_messages')
    .insert({
      poster_id: params.posterId,
      sender_id: params.senderId,
      sender_username: params.senderUsername,
      pattern: params.pattern,
      total_duration_ms: totalDurationMs,
    });

  if (error) throw error;
}

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
        <Button label="Open Scanner" onPress={onScan} style={styles.gateBtn} />
        <TouchableOpacity onPress={onBack} style={styles.gateCancel}>
          <Text style={styles.gateCancelText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  const [showRainbowCat, setShowRainbowCat] = useState(false);
  const [catVariant, setCatVariant] = useState<1 | 2>(1);
  const [alertText, setAlertText] = useState('Someone just passed you and took 1st place.');

  const [voiceSending, setVoiceSending] = useState(false);
  const [recordingHeld, setRecordingHeld] = useState(false);
  const [voicePlayingUser, setVoicePlayingUser] = useState<string | null>(null);

  const [pulseSending, setPulseSending] = useState(false);
  const [pulseHolding, setPulseHolding] = useState(false);
  const [pulseIncomingUser, setPulseIncomingUser] = useState<string | null>(null);

  const pulseHoldStartRef = useRef<number | null>(null);

  const prevLeaderUserIdRef = useRef<string | null>(null);
  const prevLeaderTeamIdRef = useRef<string | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePlayerRef = useRef<any>(null);
  const voicePlayingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const stopActivePlayback = useCallback(() => {
    if (activePlayerRef.current) {
      try {
        activePlayerRef.current.pause();
      } catch {}

      try {
        activePlayerRef.current.remove();
      } catch {}

      activePlayerRef.current = null;
    }
  }, []);

  const showPlayingIndicator = useCallback((username: string, durationMs: number) => {
    if (voicePlayingTimerRef.current) clearTimeout(voicePlayingTimerRef.current);

    setVoicePlayingUser(username);

    voicePlayingTimerRef.current = setTimeout(() => {
      setVoicePlayingUser(null);
    }, durationMs + 600);
  }, []);

  const showPulseBanner = useCallback((username: string, totalDurationMs: number) => {
    if (pulseBannerTimerRef.current) clearTimeout(pulseBannerTimerRef.current);

    setPulseIncomingUser(username);

    pulseBannerTimerRef.current = setTimeout(() => {
      setPulseIncomingUser(null);
    }, totalDurationMs + 800);
  }, []);

  const playVoiceNote = useCallback(
    async (msg: VoiceMessage) => {
      try {
        const usableUrl =
          msg.signed_url || (msg.storage_path ? await buildSignedVoiceUrl(msg.storage_path) : null);

        if (!usableUrl) return;

        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
        });

        const newPlayer = createAudioPlayer({ uri: usableUrl });

        stopActivePlayback();
        activePlayerRef.current = newPlayer;

        newPlayer.play();
        showPlayingIndicator(msg.sender_username, msg.duration_ms);
      } catch (e) {
        console.warn('[voice] play error', e);
      }
    },
    [showPlayingIndicator, stopActivePlayback]
  );

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

      if (recorderState.isRecording) {
        await recorder.stop();
      }

      const fileUri = recorder.uri ?? recorderState.url ?? null;
      const durationMs = recorderState.durationMillis ?? 0;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!fileUri || durationMs < 400 || !user?.id || !user?.username) {
        return;
      }

      Vibration.vibrate(30);

      setVoiceSending(true);

      await uploadVoiceMessage({
        posterId: id,
        senderId: user.id,
        senderUsername: user.username,
        fileUri,
        durationMs,
      });

      console.log('[voice] sent voice message to poster:', id);
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
  ]);

  const startPulseHold = useCallback(() => {
    if (pulseSending) return;

    pulseHoldStartRef.current = Date.now();
    setPulseHolding(true);

    Vibration.vibrate(20);
  }, [pulseSending]);

  const stopPulseHoldAndSend = useCallback(async () => {
    if (!pulseHolding || !user?.id || !user?.username) return;

    setPulseHolding(false);

    const startedAt = pulseHoldStartRef.current;
    pulseHoldStartRef.current = null;

    if (!startedAt) return;

    const heldMs = Date.now() - startedAt;
    const pattern = buildPulsePatternFromHold(heldMs);

    try {
      setPulseSending(true);

      await insertVibrationMessage({
        posterId: id,
        senderId: user.id,
        senderUsername: user.username,
        pattern,
      });

      console.log('[pulse] sent to poster room:', id, 'pattern:', pattern);

      Vibration.vibrate(30);
    } catch (e) {
      console.warn('[pulse] send error', e);
    } finally {
      setPulseSending(false);
    }
  }, [pulseHolding, user?.id, user?.username, id]);

  useEffect(() => {
    const voiceChannel = supabase
      .channel(`voice_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_messages',
          filter: `poster_id=eq.${id}`,
        },
        async (payload) => {
          const row = payload.new as VoiceMessage;

          if (row.sender_id === user?.id) return;

          const signedUrl = await buildSignedVoiceUrl(row.storage_path);

          if (signedUrl) {
            const incoming: VoiceMessage = { ...row, signed_url: signedUrl };
            console.log('[voice] incoming voice from:', row.sender_username, 'poster:', id);
            await playVoiceNote(incoming);
          }
        }
      )
      .subscribe((status) => {
        console.log('[voice realtime] status:', status, 'poster:', id);
      });

    return () => {
      supabase.removeChannel(voiceChannel);
      stopActivePlayback();
    };
  }, [id, user?.id, playVoiceNote, stopActivePlayback]);

  useEffect(() => {
    const pulseChannel = supabase
      .channel(`vibration_messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vibration_messages',
          filter: `poster_id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as VibrationMessage;

          console.log('[pulse] incoming row:', row);

          if (row.sender_id === user?.id) {
            console.log('[pulse] ignored own pulse');
            return;
          }

          const pattern = Array.isArray(row.pattern)
            ? row.pattern.map((x) => Number(x)).filter((x) => !Number.isNaN(x))
            : [];

          if (pattern.length > 0) {
            console.log('[pulse] received from:', row.sender_username, 'poster:', id);
            showPulseBanner(row.sender_username, row.total_duration_ms || 1200);
            Vibration.vibrate(pattern);
          }
        }
      )
      .subscribe((status) => {
        console.log('[pulse realtime] status:', status, 'poster:', id);
      });

    return () => {
      supabase.removeChannel(pulseChannel);
    };
  }, [id, user?.id, showPulseBanner]);

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

    // Nou: utilizatorul tocmai a ajuns pe locul 1
    const iGainedPlayerLead =
      prevLeaderUserId !== null &&        // nu la prima randare
      prevLeaderUserId !== myUserId &&    // nu era lider înainte
      currentLeaderUserId === myUserId;   // acum e lider

    if (iLostPlayerLead) {
      triggerLeadLostAlert('Someone just passed you and took 1st place.');
    }

    if (iGainedPlayerLead) {
      setShowRainbowCat(true);
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

      if (voicePlayingTimerRef.current) {
        clearTimeout(voicePlayingTimerRef.current);
        voicePlayingTimerRef.current = null;
      }

      if (pulseBannerTimerRef.current) {
        clearTimeout(pulseBannerTimerRef.current);
        pulseBannerTimerRef.current = null;
      }

      Vibration.cancel();
      stopActivePlayback();
    };
  }, [stopActivePlayback]);

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

  const uniqueOnlineUsers = Array.from(
    new Map(onlineUsers.map((u) => [u.userId, u])).values()
  );

  const visibleUsers = uniqueOnlineUsers.slice(0, 5);
  const extraCount = Math.max(0, uniqueOnlineUsers.length - 5);

  return (
    <View style={styles.screen}>
      {showIntro && (
        <SwordBattleIntro
          source={SWORD_BATTLE}
          onDone={() => setShowIntro(false)}
        />
      )}

      {showRainbowCat && (
        <RainbowCatPopup
          source={BLACK_RAINBOW_CAT}
          onDone={() => setShowRainbowCat(false)}
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

      {uniqueOnlineUsers.length > 0 && (
        <View style={styles.presenceBand}>
          <Text style={styles.presenceLabel}>ONLINE NOW</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.avatarRow}
          >
            {visibleUsers.map((u, index) => (
              <View key={`${u.userId}-${index}`} style={styles.avatarWrap}>
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

      <PosterAnchorView
        poster={poster}
        layers={isLoadingLayers ? [] : layers}
        glitching={showLostLeadAlert}
      />

      <ScrollView
        style={styles.lowerScrollArea}
        contentContainerStyle={styles.lowerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panelWrap}>
          <LeaderboardPanel myTeamId={myTeamId} />
          <TerritoryPanel
            territory={poster.territory}
            wsConnected={wsConnected}
            recentContributorUsernames={uniqueOnlineUsers.map((u) => u.username)}
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
            disabled={voiceSending || pulseSending}
          >
            <Text style={styles.voiceRecordBtnText}>
              {voiceSending
                ? 'SENDING...'
                : recordingHeld
                ? '● REC — RELEASE TO SEND'
                : 'HOLD TO TALK'}
            </Text>
          </TouchableOpacity>

          {voicePlayingUser ? (
            <View style={styles.voicePlayingBanner}>
              <Text style={styles.voicePlayingText}>
                ▶ {voicePlayingUser === user?.username ? 'YOU' : voicePlayingUser}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.pulsePanel}>
          <View style={styles.voiceHeader}>
            <Text style={styles.pulseTitle}>LIVE PULSE</Text>
            <Text style={styles.voiceHint}>Hold to send vibration signal</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.pulseBtn,
              pulseHolding && styles.pulseBtnActive,
            ]}
            onPressIn={startPulseHold}
            onPressOut={stopPulseHoldAndSend}
            disabled={pulseSending || voiceSending}
          >
            <Text style={styles.pulseBtnText}>
              {pulseSending
                ? 'SENDING PULSE...'
                : pulseHolding
                ? '~ HOLDING PULSE ~ RELEASE TO SEND'
                : 'HOLD TO SEND PULSE'}
            </Text>
          </TouchableOpacity>

          {pulseIncomingUser ? (
            <View style={styles.pulseIncomingBanner}>
              <Text style={styles.pulseIncomingText}>
                ≋ PULSE FROM {pulseIncomingUser.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <MuralToolbar />
    </View>
  );
}

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

  lowerScrollArea: {
    flex: 1,
  },

  lowerScrollContent: {
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

  voicePlayingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: 'rgba(0,229,255,0.08)',
    borderWidth: 1,
    borderColor: Colors.accentCyan,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },

  voicePlayingText: {
    color: Colors.accentCyan,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },

  pulsePanel: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    gap: Spacing[2],
  },

  pulseTitle: {
    color: Colors.accentPink,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },

  pulseBtn: {
    backgroundColor: 'rgba(255,46,110,0.10)',
    borderWidth: 1,
    borderColor: Colors.accentPink,
    borderRadius: Radius.full,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },

  pulseBtnActive: {
    backgroundColor: 'rgba(255,46,110,0.22)',
    transform: [{ scale: 0.99 }],
  },

  pulseBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },

  pulseIncomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: 'rgba(255,46,110,0.10)',
    borderWidth: 1,
    borderColor: Colors.accentPink,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },

  pulseIncomingText: {
    color: Colors.accentPink,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.wide,
  },

  bottomSpacer: {
    height: TOOLBAR_BOTTOM_SPACE,
  },
});