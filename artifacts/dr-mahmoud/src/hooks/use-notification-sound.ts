/**
 * useNotificationSound — plays a distinctive, pleasant notification chime
 * using the Web Audio API (no external files needed).
 *
 * Usage:
 *   const playNotificationSound = useNotificationSound();
 *   playNotificationSound(); // play on new notification
 */
export function useNotificationSound() {
  return function playNotificationSound() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // ── Chime parameters ────────────────────────────────────────────────
      // A three-note rising chime: D5 → F#5 → A5  (D major arpeggio)
      const notes = [
        { freq: 587.33, start: 0.0, duration: 0.18 },   // D5
        { freq: 739.99, start: 0.14, duration: 0.18 },  // F#5
        { freq: 880.0,  start: 0.28, duration: 0.35 },  // A5
      ];

      notes.forEach(({ freq, start, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        // Soft attack + decay envelope
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
      });

      // Auto-close AudioContext after sound finishes
      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1200);
    } catch {
      // Web Audio API not available — silent fallback
    }
  };
}
