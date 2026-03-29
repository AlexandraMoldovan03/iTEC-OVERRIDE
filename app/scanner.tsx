/**
 * app/scanner.tsx
 * Visual poster scanner — no QR codes.
 *
 * Flow:
 *   idle → user presses shutter
 *   capturing → takePictureAsync
 *   processing → matchPosterImage
 *   success    → router.replace('/poster/<id>')
 *   candidates → ConfidenceDialog (pick manually)
 *   failed     → shake + "Not recognized", reset after 2s
 *   error      → "Connection error", reset after 5s
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanFrame } from '../src/components/scanner/ScanFrame';
import { ConfidenceDialog } from '../src/components/scanner/ConfidenceDialog';
import {
  matchPosterImage,
  saveScanRecord,
  confirmScanRecord,
  ERR_BACKEND_OFFLINE,
} from '../src/services/scanService';
import { useHaptics } from '../src/hooks/useHaptics';
import {
  ScanPhase,
  ScanCandidate,
  CONFIDENCE_AUTO_OPEN,
  CONFIDENCE_CANDIDATES,
} from '../src/types/scan';
import { Colors, Spacing, Radius, Typography } from '../src/theme';
import { useAuthStore } from '../src/stores/authStore';
import { useVaultStore } from '../src/stores/vaultStore';
import { posterService } from '../src/services/posterService';

const AUTO_RESET_FAILED_MS = 2200;
const AUTO_RESET_ERROR_MS = 5000;

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();

  const user = useAuthStore((s) => s.user);
  const addScannedPoster = useVaultStore((s) => s.addScannedPoster);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [scanId, setScanId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [backendOffline, setBackendOffline] = useState(false);

  const isCapturing = useRef(false);

  useEffect(() => {
    if (phase === 'failed') {
      const t = setTimeout(() => setPhase('idle'), AUTO_RESET_FAILED_MS);
      return () => clearTimeout(t);
    }

    if (phase === 'error') {
      const t = setTimeout(() => setPhase('idle'), AUTO_RESET_ERROR_MS);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleCapture = useCallback(async () => {
    if (isCapturing.current || phase !== 'idle') return;
    if (!cameraRef.current) return;

    isCapturing.current = true;
    haptics.scanCapture();
    setPhase('capturing');

    try {
      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.55,
        skipProcessing: true,
      });

      setPhase('processing');

      const result = await matchPosterImage(pic.uri, user?.id);

      let newScanId: string | null = null;
      if (user?.id) {
        newScanId = await saveScanRecord({
          userId: user.id,
          posterId: result.posterId ?? null,
          confidence: result.confidence,
          matched: result.matched,
          corners: result.corners,
        });
        setScanId(newScanId);
      }

      if (result.confidence >= CONFIDENCE_AUTO_OPEN && result.posterId) {
        setPhase('success');
        await haptics.posterRecognized();

        const foundPoster = await posterService.fetchPoster(result.posterId);
        if (foundPoster) {
          await addScannedPoster(foundPoster);
        }

        await new Promise((r) => setTimeout(r, 600));
        router.replace(`/poster/${result.posterId}`);
        return;
      }

      if (result.confidence >= CONFIDENCE_CANDIDATES && result.candidates?.length) {
        setPhase('candidates');
        setCandidates(result.candidates);
        await haptics.candidatesFound();
        setShowDialog(true);
        return;
      }

      setPhase('failed');
      await haptics.posterNotFound();
    } catch (err: any) {
      console.warn('[scanner] capture error:', err?.message ?? err);

      if (err?.message === ERR_BACKEND_OFFLINE) {
        setBackendOffline(true);
        setPhase('error');
        setErrorMsg('');
      } else {
        setBackendOffline(false);
        setErrorMsg(err?.message ?? 'Connection error');
        setPhase('error');
      }

      await haptics.error();
    } finally {
      isCapturing.current = false;
    }
  }, [phase, user, haptics, router, addScannedPoster]);

  const handleCandidateSelect = useCallback(
    async (candidate: ScanCandidate) => {
      setShowDialog(false);
      haptics.selection();

      if (scanId) {
        await confirmScanRecord(scanId, candidate.posterId);
      }

      const foundPoster = await posterService.fetchPoster(candidate.posterId);
      if (foundPoster) {
        await addScannedPoster(foundPoster);
      }

      router.replace(`/poster/${candidate.posterId}`);
    },
    [scanId, haptics, router, addScannedPoster],
  );

  const handleDialogDismiss = useCallback(() => {
    setShowDialog(false);
    setPhase('idle');
    setCandidates([]);
    setScanId(null);
  }, []);

  if (!permission) {
    return <LoadingScreen onBack={() => router.back()} insets={insets} />;
  }

  if (!permission.granted) {
    return (
      <PermissionScreen
        onBack={() => router.back()}
        onRequest={requestPermission}
        insets={insets}
      />
    );
  }

  const isProcessing = phase === 'processing' || phase === 'capturing';
  const shutterDisabled = phase !== 'idle';

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      <ScanFrame phase={phase} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>SCAN POSTER</Text>
        <View style={styles.backBtn} />
      </View>

      {phase === 'error' && (
        <View style={styles.errorStrip}>
          {backendOffline ? (
            <>
              <Text style={styles.errorStripTitle}>⚠️ Backend offline</Text>
              <Text style={styles.errorStripText}>
                Could not connect to{'\n'}
                {process.env.EXPO_PUBLIC_SCAN_API_URL ?? 'server'}
              </Text>
              <Text style={styles.errorStripHint}>
                Start the server: cd backend &amp;&amp; python main.py
              </Text>

              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setPhase('idle');
                  setBackendOffline(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>RETRY</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.errorStripText}>
                {errorMsg || 'Connection error — try again'}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => {
                  setPhase('idle');
                  setErrorMsg('');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.retryBtnText}>RETRY</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.shutter, shutterDisabled && styles.shutterDisabled]}
          onPress={handleCapture}
          disabled={shutterDisabled}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>
      </View>

      <ConfidenceDialog
        visible={showDialog}
        candidates={candidates}
        onSelect={handleCandidateSelect}
        onDismiss={handleDialogDismiss}
      />
    </View>
  );
}

function PermissionScreen({
  onBack,
  onRequest,
  insets,
}: {
  onBack: () => void;
  onRequest: () => void;
  insets: { top: number; bottom: number };
}) {
  return (
    <View style={[styles.permScreen, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.permContent}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>Camera Access{'\n'}Required</Text>
        <Text style={styles.permDesc}>
          MuralWar needs your camera to visually identify posters in the real world.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={onRequest} activeOpacity={0.8}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.permBack}>
          <Text style={styles.permBackText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LoadingScreen({
  onBack,
  insets,
}: {
  onBack: () => void;
  insets: { top: number };
}) {
  return (
    <View style={[styles.permScreen, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.permContent}>
        <ActivityIndicator color={Colors.accentYellow} size="large" />
        <Text style={[styles.permDesc, { marginTop: Spacing[4] }]}>
          Loading camera…
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
  },
  backText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  screenTitle: {
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.black,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.widest,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  errorStrip: {
    position: 'absolute',
    top: '30%',
    left: Spacing[5],
    right: Spacing[5],
    backgroundColor: 'rgba(20,0,0,0.93)',
    borderRadius: Radius.md ?? 12,
    borderWidth: 1,
    borderColor: Colors.error + '88',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
    alignItems: 'center',
    gap: Spacing[2],
  },
  errorStripTitle: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.black,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  errorStripText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorStripHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: Spacing[1],
  },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
    marginTop: Spacing[2],
  },
  retryBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    letterSpacing: Typography.letterSpacing.widest,
  },

  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing[5],
    paddingTop: Spacing[4],
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: Colors.white,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  shutterDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity: 0,
  },
  shutterInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
  },

  permScreen: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing[5],
  },
  permContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
    paddingBottom: Spacing[12],
  },
  permIcon: {
    fontSize: 56,
  },
  permTitle: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wide,
    textAlign: 'center',
    lineHeight: Typography.fontSizes['2xl'] * 1.3,
  },
  permDesc: {
    fontSize: Typography.fontSizes.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.base * 1.6,
    maxWidth: 280,
  },
  permBtn: {
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[3],
    borderRadius: Radius.full,
    marginTop: Spacing[2],
  },
  permBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  permBack: {
    paddingVertical: Spacing[2],
  },
  permBackText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },
});