// Scales, diatonic chords, and naming.
export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES = { major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10] };
const ROMAN = ['I','II','III','IV','V','VI','VII'];

// quality: 'maj' | 'min' | 'dim'
function diatonicQuality(steps, deg) {
  const r = steps[deg], t = steps[(deg + 2) % 7], f = steps[(deg + 4) % 7];
  const third = (t - r + 12) % 12, fifth = (f - r + 12) % 12;
  if (third === 4) return 'maj';
  return fifth === 6 ? 'dim' : 'min';
}

export function buildChord(keyIndex, mode, degree, tilt, octave = 4) {
  const steps = SCALES[mode];
  const d = degree - 1;
  let quality = diatonicQuality(steps, d);
  let source = 'diatonic';
  if (tilt === 'major') { quality = 'maj'; source = 'tilt: forced major'; }
  if (tilt === 'minor') { quality = 'min'; source = 'tilt: forced minor'; }
  const rootPc = (keyIndex + steps[d]) % 12;
  const rootMidi = 12 * (octave + 1) + keyIndex + steps[d];
  const ints = quality === 'maj' ? [0,4,7] : quality === 'min' ? [0,3,7] : [0,3,6];
  const notes = ints.map(i => rootMidi + i);
  const bass = rootMidi - 12;
  let roman = ROMAN[d];
  if (quality !== 'maj') roman = roman.toLowerCase();
  if (quality === 'dim') roman += 'o';
  const suffix = quality === 'maj' ? '' : quality === 'min' ? 'm' : 'dim';
  return { roman, name: NOTE_NAMES[rootPc] + suffix, notes, bass, source };
}

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
