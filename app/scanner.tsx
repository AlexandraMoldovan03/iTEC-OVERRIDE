/**
 * app/scanner.tsx
 * Poster scanner screen.
 * Uses expo-camera for QR scanning and includes manual entry fallback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { posterService } from '../src/services/posterService';
import { Button } from '../src/components/ui/Button';
import { Colors, Spacing, Radius, Typography } from '../src/theme';
import { MOCK_POSTERS } from '../src/mock/posters';

const CORNER_SIZE = 20;
const CORNER_BORDER = 2;

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScan = async (code: string) => {
    if (loading) return;

    setLoading(true);
    try {
      const poster = await posterService.resolveByAnchor(code);

      if (poster) {
        router.replace(`/poster/${poster.id}`);
      } else {
        Alert.alert('Poster not found', `No mural found for anchor: ${code}`, [
          { text: 'Try again', onPress: () => setScanned(false) },
        ]);
      }
    } catch (error) {
      Alert.alert('Scan failed', 'Something went wrong while resolving the poster.');
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim().toUpperCase();
    if (!code) return;
    handleScan(code);
  };

  const handleDemoScan = (anchorCode: string) => {
    handleScan(anchorCode);
  };

  if (!permission) {
    return (
      <View style={styles.screen}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>SCAN POSTER</Text>
        <Text style={styles.subtitle}>Loading camera permissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>SCAN POSTER</Text>
      <Text style={styles.subtitle}>Point your camera at the QR anchor code</Text>

      {permission.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={
              scanned
                ? undefined
                : ({ data }) => {
                    setScanned(true);
                    handleScan(data);
                  }
            }
          />

          <View pointerEvents="none" style={styles.viewfinder}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>

          {scanned && (
            <TouchableOpacity style={styles.rescanBtn} onPress={() => setScanned(false)}>
              <Text style={styles.rescanText}>Tap to scan again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <View style={styles.noCamera}>
            <Text style={styles.noCameraText}>
              Camera access denied.{'\n'}Use manual entry below.
            </Text>

            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Allow camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.manual}>
        <Text style={styles.manualLabel}>Or enter anchor code manually</Text>
        <View style={styles.manualRow}>
          <TextInput
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="ANCHOR_WD_E1"
            placeholderTextColor={Colors.textMuted}
            style={styles.manualInput}
            autoCapitalize="characters"
          />
          <Button
            label="Go"
            onPress={handleManualSubmit}
            loading={loading}
            style={styles.goBtn}
          />
        </View>
      </View>

      <View style={styles.demoSection}>
        <Text style={styles.demoLabel}>DEMO — jump to a mock poster</Text>
        <View style={styles.demoRow}>
          {MOCK_POSTERS.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => handleDemoScan(p.anchorCode)}
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 60,
    paddingHorizontal: Spacing[4],
  },
  backBtn: {
    marginBottom: Spacing[4],
  },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.base,
  },
  title: {
    fontSize: Typography.fontSizes['2xl'],
    fontWeight: Typography.fontWeights.black,
    color: Colors.textPrimary,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: Typography.fontSizes.sm,
    color: Colors.textMuted,
    marginBottom: Spacing[5],
  },
  cameraWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    marginBottom: Spacing[6],
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  noCamera: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[4],
  },
  noCameraText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.base,
    textAlign: 'center',
    lineHeight: Typography.fontSizes.base * 1.8,
    marginBottom: Spacing[4],
  },
  permissionBtn: {
    backgroundColor: Colors.accentPurple,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  permissionBtnText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  viewfinder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.white,
    borderWidth: CORNER_BORDER,
  },
  tl: { top: 24, left: 24, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 24, right: 24, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 24, left: 24, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 24, right: 24, borderLeftWidth: 0, borderTopWidth: 0 },
  rescanBtn: {
    position: 'absolute',
    bottom: Spacing[4],
    alignSelf: 'center',
    backgroundColor: `${Colors.accentPurple}CC`,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.full,
  },
  rescanText: {
    color: Colors.white,
    fontSize: Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.semibold,
  },
  manual: {
    marginBottom: Spacing[6],
  },
  manualLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing[2],
    textTransform: 'uppercase',
  },
  manualRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
  },
  goBtn: {
    paddingHorizontal: Spacing[5],
  },
  demoSection: {
    gap: Spacing[2],
  },
  demoLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  demoChip: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  demoChipText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.sm,
  },
});