/**
 * src/hooks/useHaptics.ts
 * Wrapper haptic feedback pentru întreaga aplicație.
 *
 * Strategia haptics pentru scanner (iOS/Android):
 *  - iOS: haptics NU funcționează reliable cât timp camera e activă.
 *    Deci: mută feedback-urile importante DUPĂ ce camera se oprește.
 *  - Android: haptics funcționează oricând.
 *
 * Pattern de utilizare:
 *   const haptics = useHaptics();
 *   haptics.scanCapture();         // apăsare shutter
 *   haptics.posterRecognized();    // success post-capture
 *   haptics.posterNotFound();      // eroare
 *   haptics.layerPlaced();         // paint/sticker commit pe canvas
 *   haptics.territoryConflict();   // avertisment rival activity
 *
 * Instalare dacă nu e prezent:
 *   npx expo install expo-haptics
 */

import { Platform } from 'react-native';

// Import dinamic — dacă expo-haptics nu e instalat, hook-ul nu crash-uiește
let Haptics: typeof import('expo-haptics') | null = null;
try {
  Haptics = require('expo-haptics');
} catch {
  // expo-haptics nu e instalat — haptics dezactivate silențios
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeImpact(style: 'light' | 'medium' | 'heavy') {
  if (!Haptics) return;
  try {
    const map = {
      light:  Haptics.ImpactFeedbackStyle?.Light,
      medium: Haptics.ImpactFeedbackStyle?.Medium,
      heavy:  Haptics.ImpactFeedbackStyle?.Heavy,
    };
    await Haptics.impactAsync(map[style]);
  } catch { /* silențios */ }
}

async function safeNotification(type: 'success' | 'warning' | 'error') {
  if (!Haptics) return;
  try {
    const map = {
      success: Haptics.NotificationFeedbackType?.Success,
      warning: Haptics.NotificationFeedbackType?.Warning,
      error:   Haptics.NotificationFeedbackType?.Error,
    };
    await Haptics.notificationAsync(map[type]);
  } catch { /* silențios */ }
}

async function safeSelection() {
  if (!Haptics) return;
  try {
    await Haptics.selectionAsync();
  } catch { /* silențios */ }
}

// ─── Delay helper ─────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHaptics() {
  const isIOS = Platform.OS === 'ios';

  return {
    /**
     * Apăsare shutter — feedback imediat, ușor.
     * Pe iOS: light ok cât timp camera e idle (înainte de takePictureAsync).
     */
    scanCapture() {
      safeImpact('light');
    },

    /**
     * Poster recunoscut cu confidence mare → success notification.
     * IMPORTANT: Cheamă-l DUPĂ ce ai primit răspunsul backend (camera nu mai
     * e activă în acel moment pe iOS).
     * Delay 200ms pe iOS pentru a asigura că camera s-a oprit.
     */
    async posterRecognized() {
      if (isIOS) await delay(200);
      await safeNotification('success');
      // Double-tap effect: success + light impact
      await delay(120);
      await safeImpact('medium');
    },

    /**
     * Poster nerecunoscut / confidence prea mic.
     */
    async posterNotFound() {
      if (isIOS) await delay(200);
      await safeNotification('error');
    },

    /**
     * Candidați găsiți (confidence mediu) — avertisment.
     */
    async candidatesFound() {
      if (isIOS) await delay(200);
      await safeNotification('warning');
    },

    /**
     * Layer plasat pe canvas (brush stroke commit, sticker placed).
     * Chemat DUPĂ ce addLayerItem returnează (nu în timpul drawing).
     */
    async layerPlaced() {
      await safeImpact('medium');
    },

    /**
     * Activitate rivală detectată / territory conflict.
     * Warning dublu pentru urgență.
     */
    async territoryConflict() {
      await safeNotification('warning');
      await delay(200);
      await safeImpact('heavy');
    },

    /**
     * UI selection (tap pe card, tap pe candidat în dialog).
     */
    selection() {
      safeSelection();
    },

    /**
     * Tap pe buton — impact light.
     */
    tap() {
      safeImpact('light');
    },

    /**
     * Eroare generică.
     */
    async error() {
      await safeNotification('error');
    },

    /**
     * Un coechipier desenează activ pe același poster.
     * Impact light — percep că cineva lucrează alături, non-intruziv.
     */
    allyDrawing() {
      safeImpact('light');
    },

    /**
     * Un inamic desenează activ pe același poster.
     * Impact medium — mai pronunțat, simți "amenințarea".
     */
    enemyDrawing() {
      safeImpact('medium');
    },
  };
}
