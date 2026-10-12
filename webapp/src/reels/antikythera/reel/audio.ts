import { HITS } from "./utils";

/** Fully synthesized score, scheduled against the reel timeline. */
export class ReelAudio {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private out: GainNode | null = null;
  private srcs: AudioScheduledSourceNode[] = [];

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  stop() {
    if (!this.ctx || !this.out) return;
    const out = this.out;
    const srcs = this.srcs;
    out.gain.cancelScheduledValues(this.ctx.currentTime);
    out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
    setTimeout(() => {
      srcs.forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      out.disconnect();
    }, 150);
    this.out = null;
    this.srcs = [];
  }

  play(from: number) {
    this.stop();
    const ctx = this.ensure();
    const out = ctx.createGain();
    out.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    out.connect(comp);
    comp.connect(ctx.destination);
    this.out = out;
    const now = ctx.currentTime + 0.06;
    const at = (te: number) => now + Math.max(0, te - from);
    const live = (te: number) => te >= from - 0.02;
    const keep = <T extends AudioScheduledSourceNode>(s: T) => {
      this.srcs.push(s);
      return s;
    };

    const noiseSrc = () => {
      const s = keep(ctx.createBufferSource());
      s.buffer = this.noise;
      s.loop = true;
      return s;
    };

    // ---- drone pad ----
    const dg = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 3;
    dg.connect(lp);
    lp.connect(out);
    for (const [f, det] of [[55, 0], [55, 6], [82.4, -4], [110, 3]] as const) {
      const o = keep(ctx.createOscillator());
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(dg);
      o.start(now);
      o.stop(at(15.2));
    }
    const interp = (pts: [number, number][], t: number) => {
      if (t <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i][0]) {
          const k = (t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
          return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k;
        }
      }
      return pts[pts.length - 1][1];
    };
    const auto = (p: AudioParam, pts: [number, number][]) => {
      p.setValueAtTime(interp(pts, from), now);
      for (const [te, v] of pts) if (te > from) p.linearRampToValueAtTime(v, at(te));
    };
    auto(lp.frequency, [[0, 160], [2.7, 260], [5.2, 900], [8, 1500], [12.3, 500], [13.45, 2200], [15, 200]]);
    auto(dg.gain, [[0, 0], [1, 0.05], [2.6, 0.06], [2.7, 0.12], [8, 0.09], [12.3, 0.05], [13.45, 0.12], [14.4, 0.07], [15, 0]]);

    // ---- impacts ----
    const hit = (te: number, vol: number) => {
      if (!live(te)) return;
      const t0 = at(te);
      const o = keep(ctx.createOscillator());
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t0);
      o.frequency.exponentialRampToValueAtTime(34, t0 + 0.6);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.95 * vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);
      o.connect(g);
      g.connect(out);
      o.start(t0);
      o.stop(t0 + 1.4);
      const n = noiseSrc();
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.setValueAtTime(5000, t0);
      nf.frequency.exponentialRampToValueAtTime(200, t0 + 0.7);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.5 * vol, t0);
      ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.8);
      n.connect(nf);
      nf.connect(ng);
      ng.connect(out);
      n.start(t0);
      n.stop(t0 + 0.9);
    };
    HITS.forEach((h, i) => hit(h, i === 4 ? 1 : i === 3 ? 0.8 : 0.85));

    // ---- risers / whooshes into each hit ----
    const riser = (ta: number, tb: number, f0: number, f1: number, vol: number) => {
      if (tb <= from) return;
      const ts = Math.max(ta, from);
      const n = noiseSrc();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.4;
      const g = ctx.createGain();
      const k = (ts - ta) / (tb - ta);
      bp.frequency.setValueAtTime(f0 * Math.pow(f1 / f0, k), at(ts));
      bp.frequency.exponentialRampToValueAtTime(f1, at(tb));
      g.gain.setValueAtTime(vol * k * k, at(ts));
      g.gain.linearRampToValueAtTime(vol, at(tb));
      g.gain.linearRampToValueAtTime(0, at(tb) + 0.04);
      n.connect(bp);
      bp.connect(g);
      g.connect(out);
      n.start(at(ts));
      n.stop(at(tb) + 0.1);
    };
    riser(1.7, 2.7, 200, 5000, 0.4);
    riser(4.5, 5.2, 300, 4000, 0.3);
    riser(7.3, 8.0, 300, 6000, 0.45);
    riser(11.3, 12.35, 150, 3500, 0.35);
    riser(12.9, 13.45, 300, 6000, 0.4);

    // ---- slot-machine ticks ----
    const click = (te: number, f: number, vol: number, dur = 0.03) => {
      if (!live(te)) return;
      const t0 = at(te);
      const n = noiseSrc();
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      n.connect(bp);
      bp.connect(g);
      g.connect(out);
      n.start(t0, Math.random());
      n.stop(t0 + dur + 0.02);
    };
    for (let te = 0.55; te < 2.0; te += 0.045 + (te - 0.55) * 0.07) click(te, 2600, 0.18);

    // ---- gear ticks ----
    let k = 0;
    for (let te = 2.85; te < 13.2; te += 0.125, k++) {
      if (te > 8.0 && te < 8.3) continue;
      click(te, k % 4 === 0 ? 1500 : 3200, k % 4 === 0 ? 0.28 : 0.13, 0.035);
    }

    // ---- final chord ----
    if (from < 15) {
      for (const f of [110, 164.81, 220, 277.18, 329.63, 440]) {
        const o = keep(ctx.createOscillator());
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        const t0 = at(Math.max(13.45, from));
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.07, t0 + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0005, at(15.1));
        o.connect(g);
        g.connect(out);
        if (from < 15) {
          o.start(t0);
          o.stop(at(15.2));
        }
      }
    }
  }
}
