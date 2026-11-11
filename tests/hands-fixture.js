// Synthetic MediaPipe-style landmarks (21 points) for gesture tests.
const UP = { thumb: false, index: false, middle: false, ring: false, pinky: false };

function pt(x, y) { return { x, y, z: 0 }; }

function rotate(p, origin, deg) {
  const a = deg * Math.PI / 180, s = Math.sin(a), c = Math.cos(a);
  const X = p.x - origin.x, Y = origin.y - p.y;
  return pt(origin.x + X * c + Y * s, origin.y - (-X * s + Y * c));
}

// fingers: which of thumb/index/middle/ring/pinky are extended.
// tiltDeg: 0 = upright, negative = inward (major), positive = outward (minor).
export function makeHand(fingers = {}, tiltDeg = 0) {
  const f = { ...UP, ...fingers };
  const w = pt(0.50, 0.70);
  const lm = Array.from({ length: 21 }, () => pt(w.x, w.y));
  lm[0] = w;

  const cols = { index: 0.42, middle: 0.50, ring: 0.58, pinky: 0.66 };
  const mcpY = 0.55;
  const chains = { index: [5, 6, 7, 8], middle: [9, 10, 11, 12], ring: [13, 14, 15, 16], pinky: [17, 18, 19, 20] };
  for (const [name, [mcp, pip, dip, tip]] of Object.entries(chains)) {
    const x = cols[name];
    lm[mcp] = pt(x, mcpY);
    if (f[name]) {
      lm[pip] = pt(x, 0.40);
      lm[dip] = pt(x, 0.28);
      lm[tip] = pt(x, 0.15);
    } else {
      lm[pip] = pt(x, 0.50);
      lm[dip] = pt(x, 0.53);
      lm[tip] = pt(x, 0.55);
    }
  }

  // Thumb: stuck out to the left when up, folded across the palm when tucked.
  lm[1] = pt(0.44, 0.68);
  lm[2] = pt(0.40, 0.65);
  if (f.thumb) {
    lm[3] = pt(0.38, 0.62);
    lm[4] = pt(0.28, 0.58);
  } else {
    lm[3] = pt(0.52, 0.62);
    lm[4] = pt(0.58, 0.60);
  }

  if (!tiltDeg) return lm;
  return lm.map((p) => rotate(p, w, tiltDeg));
}

export const fist = () => makeHand();
export const count = (n) => {
  const names = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  const fingers = {};
  // 1-4: index through pinky, no thumb (avoids colliding with special shapes).
  // 5: all five extended.
  if (n === 5) return makeHand({ thumb: true, index: true, middle: true, ring: true, pinky: true });
  for (let i = 0; i < n; i++) fingers[names[i + 1]] = true;
  return makeHand(fingers);
};
export const rock = () => makeHand({ index: true, pinky: true });
export const ily = () => makeHand({ thumb: true, index: true, pinky: true });
