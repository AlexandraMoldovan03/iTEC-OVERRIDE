/**
 * src/components/scanner/ConfidenceDialog.tsx
 * Modal cu top-3 candidați când confidence e mediu (0.35 – 0.74).
 * Utilizatorul alege manual posterul corect sau retrage scanarea.
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { ScanCandidate } from '../../types/scan';
import { Colors, Spacing, Radius, Typography } from '../../theme';

interface ConfidenceDialogProps {
  visible:    boolean;
  candidates: ScanCandidate[];
  onSelect:   (candidate: ScanCandidate) => void;
  onDismiss:  () => void;
}

export function ConfidenceDialog({
  visible,
  candidates,
  onSelect,
  onDismiss,
}: ConfidenceDialogProps) {

  const slideAnim = React.useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue:         0,
        tension:         70,
        friction:        11,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue:         300,
        duration:        220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.warningDot} />
          <Text style={styles.title}>MULTIPLE MATCHES</Text>
        </View>
        <Text style={styles.subtitle}>
          Couldn't identify the poster with certainty.{'\n'}
          Select the correct one to continue:
        </Text>

        {/* Candidați */}
        {candidates.slice(0, 3).map((c, idx) => (
          <CandidateRow
            key={c.posterId}
            candidate={c}
            rank={idx + 1}
            onPress={() => onSelect(c)}
          />
        ))}

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>Try Again</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Rând candidat ────────────────────────────────────────────────────────────

function CandidateRow({
  candidate,
  rank,
  onPress,
}: {
  candidate: ScanCandidate;
  rank:      number;
  onPress:   () => void;
}) {
  const pct   = Math.round(candidate.confidence * 100);
  const color = pct >= 65 ? Colors.accentGreen
              : pct >= 45 ? Colors.accentYellow
              : Colors.textMuted;

  return (
    <TouchableOpacity style={styles.candidateRow} onPress={onPress} activeOpacity={0.8}>
      {/* Rank */}
      <View style={[styles.rankBadge, rank === 1 && styles.rankBadge1]}>
        <Text style={[styles.rankText, rank === 1 && styles.rankText1]}>#{rank}</Text>
      </View>

      {/* Poster info */}
      <View style={styles.candidateInfo}>
        <Text style={styles.candidateName} numberOfLines={1}>
          {candidate.posterName ?? candidate.posterId}
        </Text>
        <View style={styles.confidenceRow}>
          {/* Bar */}
          <View style={styles.confBarBg}>
            <View
              style={[
                styles.confBarFill,
                { width: `${pct}%` as any, backgroundColor: color },
              ]}
            />
          </View>
          <Text style={[styles.confPct, { color }]}>{pct}%</Text>
        </View>
      </View>

      {/* Arrow */}
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

// ─── Stiluri ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth:  1,
    borderTopColor:  Colors.accentYellow + '44',
    paddingHorizontal: Spacing[5],
    paddingBottom:   Spacing[8],
    paddingTop:      Spacing[2],
    gap:             Spacing[3],
  },
  handle: {
    width:           36,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.borderBright,
    alignSelf:       'center',
    marginBottom:    Spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing[2],
  },
  warningDot: {
    width:           8,
    height:          8,
    borderRadius:    4,
    backgroundColor: Colors.accentYellow,
    shadowColor:     Colors.accentYellow,
    shadowOpacity:   1,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 0 },
  },
  title: {
    fontSize:      Typography.fontSizes.base,
    fontWeight:    Typography.fontWeights.black,
    color:         Colors.accentYellow,
    letterSpacing: Typography.letterSpacing.widest,
  },
  subtitle: {
    fontSize:   Typography.fontSizes.sm,
    color:      Colors.textSecondary,
    lineHeight: Typography.fontSizes.sm * 1.6,
    marginBottom: Spacing[1],
  },

  // ── Candidat ────────────────────────────────────────────────
  candidateRow: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.bgSurface,
    borderRadius:   Radius.sm,
    borderWidth:    1,
    borderColor:    Colors.border,
    padding:        Spacing[3],
    gap:            Spacing[3],
  },
  rankBadge: {
    width:          28,
    height:         28,
    borderRadius:   14,
    backgroundColor: Colors.bgCard,
    borderWidth:    1,
    borderColor:    Colors.borderBright,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  rankBadge1: {
    backgroundColor: Colors.accentYellow + '22',
    borderColor:     Colors.accentYellow,
  },
  rankText: {
    fontSize:   Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.black,
    color:      Colors.textMuted,
  },
  rankText1: {
    color: Colors.accentYellow,
  },
  candidateInfo: {
    flex: 1,
    gap:  4,
  },
  candidateName: {
    fontSize:   Typography.fontSizes.sm,
    fontWeight: Typography.fontWeights.bold,
    color:      Colors.textPrimary,
    letterSpacing: 0.3,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing[2],
  },
  confBarBg: {
    flex:            1,
    height:          4,
    backgroundColor: Colors.border,
    borderRadius:    2,
    overflow:        'hidden',
  },
  confBarFill: {
    height:       4,
    borderRadius: 2,
  },
  confPct: {
    fontSize:   Typography.fontSizes.xs,
    fontWeight: Typography.fontWeights.bold,
    width:      36,
    textAlign:  'right',
  },
  arrow: {
    fontSize:   Typography.fontSizes.base,
    color:      Colors.textMuted,
  },

  // ── Dismiss ─────────────────────────────────────────────────
  dismissBtn: {
    alignItems:      'center',
    paddingVertical: Spacing[3],
    borderRadius:    Radius.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginTop:       Spacing[1],
  },
  dismissText: {
    fontSize:      Typography.fontSizes.sm,
    fontWeight:    Typography.fontWeights.bold,
    color:         Colors.textSecondary,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
});
