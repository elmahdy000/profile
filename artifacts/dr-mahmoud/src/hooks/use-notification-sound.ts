/**
 * useNotificationSound — plays a clear, distinctive notification chime
 * using the Web Audio API (no external files needed).
 *
 * Sound design: two-tone "ding dong" bell chime with rich harmonics,
 * high volume, and a resonant tail — unmistakably a notification.
 */
export function useNotificationSound() {
  return function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Master gain — loud and clear
      const master = ctx.createGain();
      master.connect(ctx.destination);
      master.gain.setValueAtTime(0.85, ctx.currentTime);

      /**
       * Play a bell-like tone at a given frequency and start time.
       * Combines a sine wave (fundamental) + a slightly detuned sine (shimmer)
       * to simulate real bell harmonics.
       */
      function playBellTone(freq: number, startAt: number, sustain: number) {
        // ── Fundamental (sine) ──────────────────────────────────────────
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(master);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(freq, startAt);
        gain1.gain.setValueAtTime(0, startAt);
        gain1.gain.linearRampToValueAtTime(0.7, startAt + 0.01);   // fast attack
        gain1.gain.exponentialRampToValueAtTime(0.001, startAt + sustain);
        osc1.start(startAt);
        osc1.stop(startAt + sustain + 0.05);

        // ── 2nd harmonic (adds bell shimmer) ────────────────────────────
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(master);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * 2.756, startAt); // inharmonic partial
        gain2.gain.setValueAtTime(0, startAt);
        gain2.gain.linearRampToValueAtTime(0.35, startAt + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, startAt + sustain * 0.6);
        osc2.start(startAt);
        osc2.stop(startAt + sustain * 0.6 + 0.05);

        // ── 3rd harmonic (body/warmth) ──────────────────────────────────
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.connect(gain3);
        gain3.connect(master);
        osc3.type = "triangle";
        osc3.frequency.setValueAtTime(freq * 1.5, startAt);
        gain3.gain.setValueAtTime(0, startAt);
        gain3.gain.linearRampToValueAtTime(0.25, startAt + 0.01);
        gain3.gain.exponentialRampToValueAtTime(0.001, startAt + sustain * 0.4);
        osc3.start(startAt);
        osc3.stop(startAt + sustain * 0.4 + 0.05);
      }

      // ── "Ding Dong" — two bell strikes ──────────────────────────────────
      // First strike: high note (E5 = 659 Hz)
      playBellTone(659, ctx.currentTime,       0.9);
      // Second strike: lower note (B4 = 494 Hz) after a short pause
      playBellTone(494, ctx.currentTime + 0.32, 1.2);

      // Auto-close AudioContext after sound finishes
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 2000);
    } catch {
      // Web Audio API not available — silent fallback
    }
  };
}
