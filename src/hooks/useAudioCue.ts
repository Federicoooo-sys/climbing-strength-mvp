import { useCallback, useRef } from 'react';

/**
 * Returns a `playBeep` function that plays a short audio cue
 * using the Web Audio API. Safe to call multiple times.
 */
export function useAudioCue() {
  const ctxRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback(() => {
    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // Audio not available — silent fail
    }
  }, []);

  return playBeep;
}
