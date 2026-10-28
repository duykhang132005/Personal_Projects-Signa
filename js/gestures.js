// Gesture classification for the user's left hand.
// Accidental bands from palm-center normalized y (0 = top of frame).
export const SHARP_Y = 0.50;            // above = sharp
export const FLAT_Y = 0.80;             // below = flat
export const ACC_HYSTERESIS = 0.04;     // band edges widen by this once inside
export const TILT_DEAD_ZONE_DEG = 15;   // within +/- this = upright (diatonic)
export const TILT_THRESHOLD_DEG = 25;   // beyond this = forced quality
export const M7B5_STABLE_FRAMES = 8;    // m7b5 shape must hold longer (easy to hit by accident)
export const STABLE_FRAMES = 4;         // frames a gesture must hold before it changes
export const THUMB_OUT_RATIO = 1.05;    // thumb tip must be this much farther from pinky MCP than the IP joint
export const THUMB_SPREAD_RATIO = 0.45; // thumb tip to index MCP must exceed this fraction of wrist to index MCP

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function fingerUp(lm, tip, pip) {
  // Extended if the tip is farther from the wrist than the PIP joint.
  return dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]) * 1.1;
}

function thumbUp(lm) {
  return dist(lm[4], lm[17]) > dist(lm[3], lm[17]) * THUMB_OUT_RATIO &&
         dist(lm[4], lm[5]) > dist(lm[0], lm[5]) * THUMB_SPREAD_RATIO;
}

export function fingerStates(lm) {
  return {
    thumb: thumbUp(lm),
    index: fingerUp(lm, 8, 6),
    middle: fingerUp(lm, 12, 10),
    ring: fingerUp(lm, 16, 14),
    pinky: fingerUp(lm, 20, 18)
  };
}

// Quality hand (code's 'right' hand): returns a QUALITIES key, or null if absent.
const COUNT_QUALITY = ['maj', 'min', 'add9', 'maj', 'sus4', 'dom7'];
export function classifyModifier(lm) {
  if (!lm) return null;
  const f = fingerStates(lm);
  // Special shape first: index + ring + pinky up, thumb and middle down.
  if (f.index && f.ring && f.pinky && !f.thumb && !f.middle) return 'm7b5';
  return COUNT_QUALITY[Object.values(f).filter(Boolean).length];
}

// Returns 0 for fist (mute), 1-7 for degrees, or null if unclear.
export function classifyDegree(lm) {
  const f = fingerStates(lm);
  // Special shapes first so they never collide with plain counts.
  if (f.index && f.pinky && !f.middle && !f.ring) return f.thumb ? 7 : 6;
  const n = [f.thumb, f.index, f.middle, f.ring, f.pinky].filter(Boolean).length;
  return n;
}

// Tilt: 'diatonic', 'major' (inward), 'minor' (outward), or 'hold' (between zones).
export function classifyTilt(lm) {
  const dx = lm[9].x - lm[0].x;
  const dy = lm[0].y - lm[9].y;
  // Angle from vertical in raw image coords. The user's left hand appears on the
  // image right; the body center is toward smaller raw x, so inward = negative dx.
  const deg = Math.atan2(dx, dy) * 180 / Math.PI;
  if (Math.abs(deg) <= TILT_DEAD_ZONE_DEG) return { tilt: 'diatonic', deg };
  if (deg <= -TILT_THRESHOLD_DEG) return { tilt: 'major', deg };
  if (deg >= TILT_THRESHOLD_DEG) return { tilt: 'minor', deg };
  return { tilt: 'hold', deg };
}

// Returns 1 (sharp), -1 (flat), or 0 (natural). prev = last stable value.
export function classifyAccidental(lm, prev = 0) {
  const y = (lm[0].y + lm[5].y + lm[17].y) / 3;
  const h = ACC_HYSTERESIS / 2;
  if (y < SHARP_Y + (prev === 1 ? h : -h)) return 1;
  if (y > FLAT_Y - (prev === -1 ? h : -h)) return -1;
  return 0;
}

export class Stabilizer {
  // overrides: optional { value: frames } for values that need a longer hold.
  constructor(frames = STABLE_FRAMES, overrides = {}) {
    this.frames = frames; this.overrides = overrides; this.cand = null; this.count = 0; this.value = null;
  }
  push(v) {
    if (v === this.cand) this.count++; else { this.cand = v; this.count = 1; }
    const need = this.overrides[v] !== undefined ? this.overrides[v] : this.frames;
    if (this.count >= need) this.value = this.cand;
    return this.value;
  }
}
