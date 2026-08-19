/**
 * Audible + haptic confirmation for gate scans.
 *
 * At a real gate the operator is holding a phone in one hand and a queue of
 * people in the other — they cannot read a panel after every ticket. A tone and
 * a buzz are what actually tell them "that one went through, next please", so
 * every scan result gets a distinct signal that is recognisable without looking.
 *
 * Tones are synthesised with the Web Audio API rather than shipped as audio
 * files: a gate often has poor connectivity, and generated tones need no
 * network, no asset loading, and no decode delay.
 *
 * IMPORTANT — neither channel here is guaranteed, so neither may be the only
 * confirmation:
 *   - iOS Safari implements no `navigator.vibrate` at all, so iPhones never buzz.
 *   - iOS routes Web Audio through a category the hardware ring/silent switch
 *     mutes, so an iPhone flipped to silent also produces no tone.
 * On an iPhone with the switch down, both are silent. That is why the scanner
 * paints the outcome over the camera viewfinder itself (see scanner-view.tsx) —
 * the visual result is the source of truth, and these are the enhancement.
 */

import type { CheckInResult } from "@/lib/api/types";

type Tone = { frequency: number; startAt: number; duration: number };

/**
 * One signature per outcome. Success rises (a "pass" gesture); every rejection
 * is lower and longer, so a reject is never mistaken for a pass in a noisy room
 * even if the operator only catches the tail of it.
 */
const TONES: Record<CheckInResult, Tone[]> = {
  // Two quick ascending blips — short enough to keep a queue moving.
  success: [
    { frequency: 880, startAt: 0, duration: 0.09 },
    { frequency: 1320, startAt: 0.1, duration: 0.13 },
  ],
  // Same pitch twice: "stop and look", not "no".
  duplicate: [
    { frequency: 520, startAt: 0, duration: 0.13 },
    { frequency: 520, startAt: 0.18, duration: 0.13 },
  ],
  // A single low buzz — unmistakably a refusal.
  invalid: [{ frequency: 200, startAt: 0, duration: 0.42 }],
  // Descending pair: valid ticket, wrong time.
  expired: [
    { frequency: 420, startAt: 0, duration: 0.14 },
    { frequency: 260, startAt: 0.16, duration: 0.24 },
  ],
};

/** Vibration patterns in ms, mirroring the tone shapes above. */
const VIBRATIONS: Record<CheckInResult, number[]> = {
  success: [80],
  duplicate: [60, 70, 60],
  invalid: [400],
  expired: [120, 80, 200],
};

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let audioContext: AudioContext | null = null;

/**
 * Lazily creates the shared AudioContext, resuming it if the browser started it
 * suspended.
 *
 * Must be called from a user gesture the first time (tapping "Start camera" or
 * "Scan") — browsers refuse to start audio otherwise, and a context created
 * outside a gesture stays suspended forever, silently swallowing every later
 * beep.
 */
export function primeScanAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!audioContext) {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) return;
      audioContext = new Ctor();
    }
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // Audio is a nicety here; the visual banner is the source of truth.
    audioContext = null;
  }
}

/** Plays the tone signature for a result. No-ops when audio is unavailable or muted. */
function playTone(result: CheckInResult): void {
  primeScanAudio();
  if (!audioContext || audioContext.state !== "running") return;

  const context = audioContext;
  const now = context.currentTime;

  for (const tone of TONES[result]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square"; // carries further than a sine over crowd noise
    oscillator.frequency.value = tone.frequency;

    // Ramp the envelope instead of switching gain outright — an abrupt start or
    // stop produces an audible click on most speakers.
    const start = now + tone.startAt;
    const end = start + tone.duration;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}

/** Buzzes the device for a result, where the browser supports it (Android; iOS Safari does not). */
function vibrate(result: CheckInResult): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(VIBRATIONS[result]);
  } catch {
    // Some browsers throw when vibration is blocked by a permissions policy.
  }
}

/**
 * Fires the full non-visual signal for a scan outcome.
 * @param result - the check-in outcome to announce
 * @param options.sound - play the tone (operators can mute; haptics stay on)
 */
export function signalScanResult(result: CheckInResult, { sound = true }: { sound?: boolean } = {}): void {
  if (sound) playTone(result);
  vibrate(result);
}

// Exported for unit tests — every result must have both signatures, or a scan
// outcome would announce itself as silence.
export const __testables = { TONES, VIBRATIONS };

/**
 * The operator's mute preference, persisted across reloads (a second scanner
 * beside the first is usually muted so the two don't talk over each other).
 *
 * Modelled as an external store rather than `useState` + an effect: reading
 * localStorage during render would desync SSR from hydration, and reading it in
 * an effect means a setState-in-effect cascade. `useSyncExternalStore` is the
 * sanctioned way to read a client-only value — it serves `true` during SSR and
 * swaps to the stored value on the client without a mismatch.
 */
const SOUND_STORAGE_KEY = "sitiket.scanner.sound";

const soundListeners = new Set<() => void>();
/** Cached so `getSnapshot` returns a stable value across renders, as the hook requires. */
let soundEnabled: boolean | null = null;

export const soundPreference = {
  subscribe(listener: () => void): () => void {
    soundListeners.add(listener);
    return () => soundListeners.delete(listener);
  },
  /** Client snapshot. Anything other than an explicit "off" means sound is on. */
  get(): boolean {
    if (soundEnabled === null) {
      try {
        soundEnabled = window.localStorage.getItem(SOUND_STORAGE_KEY) !== "off";
      } catch {
        soundEnabled = true; // private mode / storage blocked
      }
    }
    return soundEnabled;
  },
  /** Server snapshot — sound defaults on, so SSR renders the common case. */
  getServerSnapshot(): boolean {
    return true;
  },
  set(next: boolean): void {
    soundEnabled = next;
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
    } catch {
      // Preference just won't survive a reload.
    }
    soundListeners.forEach((listener) => listener());
  },
};
