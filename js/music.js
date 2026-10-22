// Scales, diatonic chords, and naming.
export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const SCALES = { major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10] };
const ROMAN = ['I','II','III','IV','V','VI','VII'];
const NATURALS = [0,2,4,5,7,9,11]; // C D E F G A B for Free mode

// Chord qualities: add new entries (e.g. 7ths, sus) here.
export const QUALITIES = {
  maj: { ints: [0,4,7], suffix: '' },
  min: { ints: [0,3,7], suffix: 'm' },
  dim: { ints: [0,3,6], suffix: 'dim' }
};

// quality: 'maj' | 'min' | 'dim'
function diatonicQuality(steps, deg) {
  const r = steps[deg], t = steps[(deg + 2) % 7], f = steps[(deg + 4) % 7];
  const third = (t - r + 12) % 12, fifth = (f - r + 12) % 12;
  if (third === 4) return 'maj';
  return fifth === 6 ? 'dim' : 'min';
}

export function buildChord(keyIndex, mode, degree, tilt, octave = 4) {
  if (mode === 'free') return buildFreeChord(degree, tilt, octave);
  const steps = SCALES[mode];
  const d = degree - 1;
  let quality = diatonicQuality(steps, d);
  let source = 'diatonic';
  if (tilt === 'major') { quality = 'maj'; source = 'tilt: forced major'; }
  if (tilt === 'minor') { quality = 'min'; source = 'tilt: forced minor'; }
  const rootPc = (keyIndex + steps[d]) % 12;
  const rootMidi = 12 * (octave + 1) + keyIndex + steps[d];
  const { notes, bass } = voice(rootMidi, quality);
  let roman = ROMAN[d];
  if (quality !== 'maj') roman = roman.toLowerCase();
  if (quality === 'dim') roman += 'o';
  return { roman, name: NOTE_NAMES[rootPc] + QUALITIES[quality].suffix, notes, bass, source };
}

function voice(rootMidi, quality) {
  return { notes: QUALITIES[quality].ints.map(i => rootMidi + i), bass: rootMidi - 12 };
}

// Free mode: degree 1-7 maps to natural roots C-B; tilt outward = minor, else major.
function buildFreeChord(degree, tilt, octave) {
  const pc = NATURALS[degree - 1];
  const quality = tilt === 'minor' ? 'min' : 'maj';
  const { notes, bass } = voice(12 * (octave + 1) + pc, quality);
  const source = tilt === 'minor' ? 'Free: tilt minor' : 'Free: major';
  return { roman: 'Free', name: NOTE_NAMES[pc] + QUALITIES[quality].suffix, notes, bass, source, free: true };
}

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
