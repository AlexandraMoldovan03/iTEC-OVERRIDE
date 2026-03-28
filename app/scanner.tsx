/**
 * app/scanner.tsx
 * Visual poster scanner — no QR codes.
 *
 * Flow:
 *   idle → user presses shutter
 *   capturing → takePictureAsync
 *   processing → matchPosterImage (backend / demo fallback)
 *   success    → router.replace('/poster/<id>')
 *   candidates → ConfidenceDialog (pick manually)
 *   failed     → shake + "Not recognized", reset after 2s
 *   error      → "Connection error", reset after 3s
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScanFrame }        from '../src/components/scanner/ScanFrame';
import { ConfidenceDialog } from '../src/components/scanner/ConfidenceDialog';
import { matchPosterImage, saveScanRecord, confirmScanRecord } from '../src/services/scanService';
import { useHaptics }       from '../src/hooks/useHaptics';
import {
  ScanPhase,
  ScanCandidate,
  CONFIDENCE_AUTO_OPEN,
  CONFIDENCE_CANDIDATES,
} from '../src/types/scan';
import { Colors, Spacing, Radius, Typography } from '../src/theme';
import { MOCK_POSTERS } from '../src/mock/posters';

// ─── Auth (same pattern as the rest of the app) ───────────────────────────────

import { useAuthStore }  from '../src/stores/authStore';
import { useVaultStore } from '../src/stores/vaultStore';
import { posterService } from '../src/services/posterService';

// ─── Constants ────────────────────────────────────────────────────────────────

const AUTO_RESET_FAILED_MS = 2200;
const AUTO_RESET_ERROR_MS  = 3000;

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ScannerScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const haptics = useHaptics();
  const user            = useAuthStore((s) => s.user);
  const addScannedPoster = useVaultStore((s) => s.addScannedPoster);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // ── State machine ─────────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<ScanPhase>('idle');
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [scanId,     setScanId]     = useState<string | null>(null);
  const [errorMsg,   setErrorMsg]   = useState<string>('');

  // Prevent double-captures while a scan is in progress
  const isCapturing = useRef(false);

  // ── Auto-reset after failed / error ───────────────────────────────────────
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

  // ── Capture handler ───────────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (isCapturing.current || phase !== 'idle') return;
    if (!cameraRef.current) return;

    isCapturing.current = true;
    haptics.scanCapture();
    setPhase('capturing');

    try {
      // 1. Take picture
      const pic = await cameraRef.current.takePictureAsync({
        quality:    0.72,
        skipProcessing: false,
      });

      setPhase('processing');

      // 2. Match image against backend (or demo fallback)
      const result = await matchPosterImage(pic.uri, user?.id);

      // 3. Optionally save scan record
      let newScanId: string | null = null;
      if (user?.id) {
        newScanId = await saveScanRecord({
          userId:     user.id,
          posterId:   result.posterId ?? null,
          confidence: result.confidence,
          matched:    result.matched,
          corners:    result.corners,
        });
        setScanId(newScanId);
      }

      // 4. Route by confidence
      if (result.confidence >= CONFIDENCE_AUTO_OPEN && result.posterId) {
        // ── Auto-open ─────────────────────────────────────────
        setPhase('success');
        await haptics.posterRecognized();

        // Adaugă posterul în vault ÎNAINTE de navigare
        const foundPoster = await posterService.fetchPoster(result.posterId);
        if (foundPoster) await addScannedPoster(foundPoster);

        // Small pause so user sees the success state
        await new Promise((r) => setTimeout(r, 600));
        router.replace(`/poster/${result.posterId}`);

      } else if (result.confidence >= CONFIDENCE_CANDIDATES && result.candidates?.length) {
        // ── Show candidate dialog ──────────────────────────────
        setPhase('candidates');
        setCandidates(result.candidates);
        await haptics.candidatesFound();
        setShowDialog(true);

      } else {
        // ── Not recognized ─────────────────────────────────────
        setPhase('failed');
        await haptics.posterNotFound();
      }

    } catch (err: any) {
      console.warn('[scanner] capture error:', err?.message ?? err);
      setErrorMsg(err?.message ?? 'Connection error');
      setPhase('error');
      await haptics.error();
    } finally {
      isCapturing.current = false;
    }
  }, [phase, user, haptics, router]);

  // ── Candidate selected from dialog ────────────────────────────────────────
  const handleCandidateSelect = useCallback(async (candidate: ScanCandidate) => {
    setShowDialog(false);
    haptics.selection();

    // Confirm in DB if we have a scan record
    if (scanId) {
      await confirmScanRecord(scanId, candidate.posterId);
    }

    // Adaugă posterul în vault
    const foundPoster = await posterService.fetchPoster(candidate.posterId);
    if (foundPoster) await addScannedPoster(foundPoster);

    router.replace(`/poster/${candidate.posterId}`);
  }, [scanId, haptics, router, addScannedPoster]);

  // ── Dialog dismissed ──────────────────────────────────────────────────────
  const handleDialogDismiss = useCallback(() => {
    setShowDialog(false);
    setPhase('idle');
    setCandidates([]);
    setScanId(null);
  }, []);

  // ── Demo shortcut ─────────────────────────────────────────────────────────
  const handleDemo = useCallback((posterId: string) => {
    haptics.tap();
    router.replace(`/poster/${posterId}`);
  }, [haptics, router]);

  // ── Permission screens ────────────────────────────────────────────────────
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

  // ── Main UI ───────────────────────────────────────────────────────────────
  const isProcessing = phase === 'processing' || phase === 'capturing';
  const shutterDisabled = phase !== 'idle';

  return (
    <View style={styles.root}>
      {/* ── Full-screen camera ─────────────────────────────────── */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* ── Animated overlay ──────────────────────────────────── */}
      <ScanFrame phase={phase} />

      {/* ── Top bar ───────────────────────────────────────────── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>SCAN POSTER</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Error message strip ────────────────────────────────── */}
      {phase === 'error' && (
        <View style={styles.errorStrip}>
          <Text style={styles.errorStripText}>
            {errorMsg || 'Connection error — try again'}
          </Text>
        </View>
      )}

      {/* ── Bottom controls ───────────────────────────────────── */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>

        {/* Shutter button */}
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

        {/* Demo chips */}
        <View style={styles.demoWrap}>
          <Text style={styles.demoLabel}>DEMO POSTERS</Text>
          <View style={styles.demoRow}>
            {MOCK_POSTERS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => handleDemo(p.id)}
                style={styles.demoChip}
                activeOpacity={0.7}
              >
                <Text style={styles.demoChipText}>
                  {p.name.split('—')[0].trim()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ── Candidate dialog ──────────────────────────────────── */}
      <ConfidenceDialog
        visible={showDialog}
        candidates={candidates}
        onSelect={handleCandidateSelect}
        onDismiss={handleDialogDismiss}
      />
    </View>
  );
}

// ─── Permission screen ────────────────────────────────────────────────────────

function PermissionScreen({
  onBack,
  onRequest,
  insets,
}: {
  onBack:     () => void;
  onRequest:  () => void;
  insets:     { top: number; bottom: number };
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

// ─── Loading screen ───────────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Top bar ─────────────────────────────────────────────────
  topBar: {
    position:       'absolute',
    top:            0,
    left:           0,
    right:          0,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingBottom:  Spacing[3],
  },
  backBtn: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius:   18,
  },
  backText: {
    color:    Colors.white,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.bold,
  },
  screenTitle: {
    fontSize:      Typography.fontSizes.sm,
    fontWeight:    Typography.fontWeights.black,
    color:         Colors.white,
    letterSpacing: Typography.letterSpacing.widest,
    textShadowColor:  'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── Error strip ─────────────────────────────────────────────
  errorStrip: {
    position:        'absolute',
    top:             '50%',
    left:            Spacing[6],
    right:           Spacing[6],
    backgroundColor: Colors.error + 'CC',
    borderRadius:    Radius.sm,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    alignItems:      'center',
  },
  errorStripText: {
    color:     Colors.white,
    fontSize:  Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
    textAlign: 'center',
  },

  // ── Bottom area ─────────────────────────────────────────────
  bottomArea: {
    position:  'absolute',
    bottom:    0,
    left:      0,
    right:     0,
    alignItems: 'center',
    gap:        Spacing[5],
    paddingTop: Spacing[4],
  },

  // Shutter button
  shutter: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: Colors.white,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     3,
    borderColor:     'rgba(255,255,255,0.4)',
    shadowColor:     Colors.white,
    shadowOpacity:   0.4,
    shadowRadius:    12,
    shadowOffset:    { width: 0, height: 0 },
    elevation:       8,
  },
  shutterDisabled: {
    backgroundColor: Colors.textMuted,
    shadowOpacity:   0,
  },
  shutterInner: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: Colors.white,
  },

  // Demo chips
  demoWrap: {
    alignItems: 'center',
    gap:        Spacing[2],
    paddingHorizontal: Spacing[4],
  },
  demoLabel: {
    color:         'rgba(255,255,255,0.45)',
    fontSize:      Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    justifyContent: 'center',
    gap:            Spacing[2],
  },
  demoChip: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.2)',
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical:   Spacing[1],
  },
  demoChipText: {
    color:    'rgba(255,255,255,0.7)',
    fontSize: Typography.fontSizes.xs,
  },

  // ── Permission / Loading screens ─────────────────────────────
  permScreen: {
    flex:            1,
    backgroundColor: Colors.bg,
    paddingHorizontal: Spacing[5],
  },
  permContent: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing[4],
    paddingBottom:  Spacing[12],
  },
  permIcon: {
    fontSize: 56,
  },
  permTitle: {
    fontSize:   Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color:      Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.wide,
    textAlign:  'center',
    lineHeight: Typography.fontSizes['2xl'] * 1.3,
  },
  permDesc: {
    fontSize:   Typography.fontSizes.base,
    color:      Colors.textSecondary,
    textAlign:  'center',
    lineHeight: Typography.fontSizes.base * 1.6,
    maxWidth:   280,
  },
  permBtn: {
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: Spacing[8],
    paddingVertical:   Spacing[3],
    borderRadius:      Radius.full,
    marginTop:         Spacing[2],
  },
  permBtnText: {
    color:      Colors.white,
    fontSize:   Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  permBack: {
    paddingVertical: Spacing[2],
  },
  permBackText: {
    color:    Colors.textMuted,
    fontSize: Typography.fontSizes.sm,
  },
});
