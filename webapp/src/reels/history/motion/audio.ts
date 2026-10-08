// Fully synthesized soundtrack (WebAudio), scheduled on the same 120 BPM grid as the cuts.

import { DURATION } from './util';

const CUTS = [1.5, 3.5, 5.5, 7.5, 9.5, 11.5, 13.5];
const SECTION_STARTS = [0, ...CUTS];
const ROOTS = [55, 55, 65.41, 73.42, 82.41, 98, 110, 110];
const BASS_PAT = [1, 0, 1, 1, 0, 1, 2, 0];
const ARP_PAT = [0, 2, 4, 2, 5, 4, 2, 1, 0, 2, 4, 5, 7, 5, 4, 2];
const PENTA = [0, 3, 5, 7, 10, 12, 15, 17];

export class Sound {
  ctx?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private capDest?: MediaStreamAudioDestinationNode;
  audible = false;
  capture = false;

  private ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.capDest = this.ctx.createMediaStreamDestination();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  captureStream() {
    this.ensure();
    return this.capDest!.stream;
  }

  stop() {
    if (this.master && this.ctx) {
      const m = this.master;
      m.gain.cancelScheduledValues(this.ctx.currentTime);
      m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
      setTimeout(() => m.disconnect(), 200);
      this.master = undefined;
    }
  }

  start(from: number) {
    this.stop();
    if (!this.audible && !this.capture) return;
    const ctx = this.ensure();
    const now = ctx.currentTime + 0.06;
    const at = (t: number) => now + (t - from);

    const master = ctx.createGain();
    master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 5;
    master.connect(comp);
    if (this.audible) comp.connect(ctx.destination);
    if (this.capture && this.capDest) comp.connect(this.capDest);
    this.master = master;

    // dotted-eighth echo bus for plucks
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.1875 * 2;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dl = ctx.createGain();
    dl.gain.value = 0.5;
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(dl);
    dl.connect(master);

    const env = (g: GainNode, t: number, peak: number, dec: number, atk = 0.004) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    };
    const noiseSrc = (t: number, dur: number) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise!;
      s.loop = true;
      s.start(t, Math.random());
      s.stop(t + dur);
      return s;
    };

    const kick = (t: number, v = 1) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(170, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
      env(g, t, 0.95 * v, 0.42);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.5);
    };
    const hat = (t: number, v: number, dur = 0.05) => {
      const s = noiseSrc(t, dur + 0.02);
      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7500;
      const g = ctx.createGain();
      env(g, t, 0.16 * v, dur, 0.001);
      s.connect(f).connect(g).connect(master);
    };
    const clap = (t: number) => {
      for (let i = 0; i < 3; i++) {
        const tt = t + i * 0.011;
        const s = noiseSrc(tt, 0.2);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1900;
        f.Q.value = 0.8;
        const g = ctx.createGain();
        env(g, tt, 0.34, i === 2 ? 0.18 : 0.02, 0.001);
        s.connect(f).connect(g).connect(master);
      }
    };
    const bass = (t: number, freq: number, dur: number) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      f.frequency.exponentialRampToValueAtTime(140, t + dur);
      f.Q.value = 6;
      const g = ctx.createGain();
      env(g, t, 0.3, dur, 0.008);
      o.connect(f).connect(g).connect(master);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const pluck = (t: number, freq: number, v: number) => {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(3800, t);
      f.frequency.exponentialRampToValueAtTime(500, t + 0.16);
      const g = ctx.createGain();
      env(g, t, 0.07 * v, 0.18, 0.002);
      o.connect(f).connect(g);
      g.connect(master);
      g.connect(delay);
      o.start(t);
      o.stop(t + 0.22);
    };
    const whoosh = (t: number, dur: number, v = 1) => {
      const s = noiseSrc(t, dur + 0.05);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.4;
      f.frequency.setValueAtTime(250, t);
      f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * v, t + dur);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04);
      s.connect(f).connect(g).connect(master);
    };
    const impact = (t: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.5);
      env(g, t, 1.0, 0.8);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.9);
      const s = noiseSrc(t, 0.5);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(5000, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      const ng = ctx.createGain();
      env(ng, t, 0.4, 0.45, 0.001);
      s.connect(f).connect(ng).connect(master);
    };
    const chord = (t: number) => {
      [110, 164.81, 220, 261.63, 329.63].forEach((fq, i) => {
        [-6, 6].forEach((det) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = fq;
          o.detune.value = det;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.setValueAtTime(3200, t);
          f.frequency.exponentialRampToValueAtTime(400, t + 1.4);
          const g = ctx.createGain();
          env(g, t, 0.05 - i * 0.004, 1.45, 0.01);
          o.connect(f).connect(g).connect(master);
          o.start(t);
          o.stop(t + 1.5);
        });
      });
    };

    const sectionAt = (t: number) => {
      let s = 0;
      for (let i = 0; i < SECTION_STARTS.length; i++) if (t >= SECTION_STARTS[i] - 1e-6) s = i;
      return s;
    };

    const STEP = 0.125;
    for (let n = 0; n * STEP < DURATION; n++) {
      const t = n * STEP;
      if (t < from - 1e-6) continue;
      const sec = sectionAt(t);
      const inBody = t >= 1.5 - 1e-6 && t < 13.5 - 1e-6;
      const beat = n % 4 === 0;
      const beatIdx = n / 4;

      if (t < 1.5 - 1e-6 && n >= 4) hat(at(t), 0.5 + (t / 1.5) * 0.9, 0.03);
      if (!inBody) continue;
      if (beat) kick(at(t));
      if (n % 4 === 2) hat(at(t), 1, 0.07);
      if (n % 2 === 1) hat(at(t), 0.45, 0.025);
      if (beat && beatIdx % 2 === 1 && t >= 3.5) clap(at(t));
      if (n % 2 === 0 && t < 13.5 - 1e-6) {
        const step = n / 2;
        const mult = [1, 1, 1.5, 2][BASS_PAT[step % 8]] ?? 1;
        if (BASS_PAT[step % 8] !== 0 || step % 4 === 0) bass(at(t), ROOTS[sec] * mult, 0.22);
      }
      if (t >= 5.5 - 1e-6) {
        const note = PENTA[ARP_PAT[n % 16] % PENTA.length];
        const fq = ROOTS[sec] * 4 * Math.pow(2, note / 12);
        pluck(at(t), fq, 0.5 + 0.5 * ((n % 4 === 0 ? 1 : 0.6)));
      }
    }

    // transitions: riser + impact on each cut
    CUTS.forEach((b) => {
      const ws = b - 0.4;
      if (ws >= from - 1e-6) whoosh(at(ws), 0.4, b === 13.5 ? 1.2 : 0.8);
      if (b >= from - 1e-6) impact(at(b));
    });
    // opening riser
    if (from < 0.05) whoosh(at(0.05), 1.4, 0.9);
    if (13.5 >= from - 1e-6) chord(at(13.5));
    if (from < 14.5) {
      // closing fade for clean loop
      master.gain.setValueAtTime(0.8, at(14.5));
      master.gain.linearRampToValueAtTime(0.0, at(15));
    }
  }
}
