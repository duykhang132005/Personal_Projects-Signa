// Scales, diatonic chords, and naming.
export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const SCALES = { major: [0,2,4,5,7,9,11], minor: [0,2,3,5,7,8,10] };
const ROMAN = ['I','II','III','IV','V','VI','VII'];
const NATURALS = [0,2,4,5,7,9,11]; // C D E F G A B for Free mode

// Chord qualities: add new entries (e.g. 7ths, sus) here.
export const QUALITIES = {
  maj: { ints: [0,4,7], suffix: '' },
  min: { ints: [0,3,7], suffix: 'm' },
  dim: { ints: [0,3,6], suffix: 'dim' },
  dom7: { ints: [0,4,7,10], suffix: '7' },
  maj7: { ints: [0,4,7,11], suffix: 'maj7' },
  m7: { ints: [0,3,7,10], suffix: 'm7' },
  m7b5: { ints: [0,3,6,10], suffix: 'm7b5' },
  // Roadmap placeholders (sus2, 7sus4, madd9): defined but not yet reachable from the UI.
  sus2: { ints: [0,2,7], suffix: 'sus2' },
  sus4: { ints: [0,5,7], suffix: 'sus4' },
  '7sus4': { ints: [0,5,7,10], suffix: '7sus4' },
  add9: { ints: [0,4,7,14], suffix: 'add9' },
  madd9: { ints: [0,3,7,14], suffix: 'madd9' }
};

// Quality-hand value (a QUALITIES key) overrides tilt and the Chord type picker.
// mod: null when the quality hand is absent.

// Chord types that replace the third regardless of tilt.
const SUS_TYPES = { sus2: 'sus2', sus4: 'sus4' };

// Upgrade a triad quality to a 7th. type: 'triad' | '7th' | 'maj7'.
function forcedSeventh(q, type) {
  if (type === 'triad') return q;
  if (q === 'maj') return type === 'maj7' ? 'maj7' : 'dom7';
  return q === 'min' ? 'm7' : 'm7b5';
}

function nameRoot(pc, acc) { return (acc < 0 ? FLAT_NAMES : NOTE_NAMES)[pc]; }
const ACC_PREFIX = { '-1': 'b', '0': '', '1': '#' };

// quality: 'maj' | 'min' | 'dim'
function diatonicQuality(steps, deg) {
  const r = steps[deg], t = steps[(deg + 2) % 7], f = steps[(deg + 4) % 7];
  const third = (t - r + 12) % 12, fifth = (f - r + 12) % 12;
  if (third === 4) return 'maj';
  return fifth === 6 ? 'dim' : 'min';
}

export function buildChord(keyIndex, mode, degree, tilt, octave = 4, type = 'triad', acc = 0, mod = null) {
  if (mode === 'free') return buildFreeChord(degree, tilt, octave, type, acc, mod);
  const steps = SCALES[mode];
  const d = degree - 1;
  let quality = diatonicQuality(steps, d);
  let source = 'diatonic';
  if (tilt === 'major') { quality = 'maj'; source = 'tilt: forced major'; }
  if (tilt === 'minor') { quality = 'min'; source = 'tilt: forced minor'; }
  if (mod) { quality = mod; source = 'hand: ' + mod; }
  else if (SUS_TYPES[type]) { quality = SUS_TYPES[type]; source = 'sus'; }
  else if (type !== 'triad') {
    if (source === 'diatonic') {
      const sev = (steps[(d + 6) % 7] - steps[d] + 12) % 12;
      quality = quality === 'maj' ? (sev === 11 ? 'maj7' : 'dom7') : quality === 'min' ? 'm7' : 'm7b5';
    } else quality = forcedSeventh(quality, type);
  }
  const rootPc = (keyIndex + steps[d] + acc + 12) % 12;
  const rootMidi = 12 * (octave + 1) + keyIndex + steps[d] + acc;
  const { notes, bass } = voice(rootMidi, quality);
  let roman = ROMAN[d];
  if (quality.startsWith('m') && !quality.startsWith('maj') || quality === 'dim') roman = roman.toLowerCase();
  if (quality === 'dim') roman += 'o';
  roman = ACC_PREFIX[acc] + roman;
  return { roman, name: nameRoot(rootPc, acc) + QUALITIES[quality].suffix, notes, bass, source, acc };
}

function voice(rootMidi, quality) {
  return { notes: QUALITIES[quality].ints.map(i => rootMidi + i), bass: rootMidi - 12 };
}

// Free mode: degree 1-7 maps to natural roots C-B; tilt outward = minor, else major.
function buildFreeChord(degree, tilt, octave, type, acc, mod) {
  const raw = NATURALS[degree - 1] + acc;
  const pc = (raw + 12) % 12;
  const base = tilt === 'minor' ? 'min' : 'maj';
  const quality = mod ? mod : SUS_TYPES[type] || forcedSeventh(base, type);
  const { notes, bass } = voice(12 * (octave + 1) + raw, quality);
  const source = mod ? 'hand: ' + mod : SUS_TYPES[type] ? 'sus' : tilt === 'minor' ? 'Free: tilt minor' : 'Free: major';
  return { roman: 'Free', name: nameRoot(pc, acc) + QUALITIES[quality].suffix, notes, bass, source, free: true, acc };
}

// Inversions. mode: 'off' | '1' | '2' | '3' | 'voice'. Off returns the chord unchanged.
// Inversion n raises the n lowest chord tones by an octave (clamped to notes - 1).
function rotate(notes, n) {
  const out = notes.slice().sort((a, b) => a - b);
  for (let i = 0; i < n; i++) out.push(out.shift() + 12);
  return out;
}

// Distance from each note to the nearest previous note.
function moveCost(notes, prev) {
  return notes.reduce((s, n) => s + Math.min(...prev.map(p => Math.abs(p - n))), 0);
}

export function invertChord(c, mode, prevNotes) {
  if (mode === 'off') return c;
  const max = c.notes.length - 1;
  let notes;
  if (mode === 'voice') {
    if (!prevNotes || !prevNotes.length) return c;
    let best = null, bestCost = Infinity;
    for (let n = 0; n <= max; n++) {
      for (const shift of [-12, 0]) {
        const cand = rotate(c.notes, n).map(x => x + shift);
        const cost = moveCost(cand, prevNotes);
        if (cost < bestCost) { bestCost = cost; best = cand; }
      }
    }
    notes = best;
  } else {
    notes = rotate(c.notes, Math.min(Number(mode), max));
  }
  const rootPc = (c.bass % 12 + 12) % 12;
  const lowPc = (notes[0] % 12 + 12) % 12;
  const bass = notes[0] - 12; // bass doubles the lowest chord tone an octave down
  const name = lowPc === rootPc ? c.name : c.name + '/' + nameRoot(lowPc, c.acc);
  return { ...c, notes, bass, name };
}

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
