/**
 * app/poster/[id].tsx
 * The Poster Room — the live mural battle arena.
 *
 * Layout:
 *   [Top HUD: poster name + WS status]
 *   [Poster anchor view with mural canvas overlay]
 *   [Territory panel — collapsible]
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
import { MOCK_USERS } from '../../src/mock/users';
import { Colors, Spacing, Typography } from '../../src/theme';

export default function PosterRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { poster, layers, isLoadingPoster, isLoadingLayers, wsConnected, error } =
    usePosterRoom(id);

  const activeTool = useMuralToolStore((s) => s.activeTool);

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

  // Resolve usernames for recent contributors
  const recentNames = poster.territory.recentContributorIds.map(
    (id) => MOCK_USERS.find((u) => u.id === id)?.username ?? id
  );

  return (
    <View style={styles.screen}>
      {/* HUD top bar */}
      <View style={styles.hud}>
        <TouchableOpacity onPress={() => router.back()} style={styles.hudBack}>
          <Text style={styles.hudBackText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.hudCenter}>
          <Text style={styles.hudTitle} numberOfLines={1}>{poster.name}</Text>
        </View>
        <LiveIndicator connected={wsConnected} style={styles.liveIndicator} />
      </View>

      {/* Poster + mural canvas */}
      <PosterAnchorView poster={poster} layers={isLoadingLayers ? [] : layers} />

      {/* Territory info panel */}
      <View style={styles.panelWrap}>
        <TerritoryPanel
          territory={poster.territory}
          wsConnected={wsConnected}
          recentContributorUsernames={recentNames}
        />
      </View>

      {/* Tool option row — contextual */}
      <View style={styles.toolOptions}>
        {(activeTool === 'brush' || activeTool === 'spray' || activeTool === 'glow') && (
          <ColorPicker />
        )}
        {activeTool === 'sticker' && <StickerPicker />}
      </View>

      {/* Bottom toolbar */}
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
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: 52,
    paddingBottom: Spacing[3],
    backgroundColor: Colors.bg,
    gap: Spacing[3],
  },
  hudBack: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudBackText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSizes.lg,
  },
  hudCenter: {
    flex: 1,
  },
  hudTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSizes.base,
    fontWeight: Typography.fontWeights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  liveIndicator: {
    flexShrink: 0,
  },
  panelWrap: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  toolOptions: {
    minHeight: 0,
  },
});
