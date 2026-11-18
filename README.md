# Signa

Signa is a browser app that turns hand gestures in front of your webcam into sustained pad chords. It is an original implementation inspired by the Air Chord idea; no code or assets were copied from other projects.

## Gestures

Signa tracks two hands by role. The chord hand is drawn cyan on the overlay and picks the degree, tilt and accidental. The quality hand is drawn orange and sets the chord quality. Because the camera view is mirrored, go by the overlay color rather than left or right.

### Chord hand (cyan)

| Gesture | Result |
| --- | --- |
| 1 to 5 extended fingers | Scale degree 1 to 5 |
| Rock sign (index + pinky, thumb tucked) | Degree 6 |
| I-love-you sign (thumb + index + pinky) | Degree 7 |
| Fist | Mute (release) |
| Space or Esc key | Silence the current chord (it plays again when the chord changes or after a fist) |
| F key | Enter or leave full screen |
| Chord hand upright | Diatonic chord for the degree |
| Tilt inward (toward body center) | Force major |
| Tilt outward | Force minor |
| Chord hand in top band of the frame | Sharp (root up a semitone) |
| Chord hand in middle band | Natural |
| Chord hand in bottom band | Flat (root down a semitone) |

### Quality hand (orange)

| Shape | Quality |
| --- | --- |
| Fist or 3 fingers | Major |
| 1 finger | Minor |
| 2 fingers | add9 |
| 4 fingers | sus4 |
| 5 fingers | Add a 7th (tilt still picks major or minor, so a minor tilt is m7) |
| Index + ring + pinky (thumb and middle down) | m7b5 |
| Absent | Fall back to tilt and Chord type |

Chord type and quality:

- Triad plays 3-note chords.
- 7th plays diatonic 7ths when upright (I maj7, ii m7, iii m7, IV maj7, V7, vi m7, vii m7b5). A forced or Free major is a dominant 7; a minor tilt is m7.
- Maj7 is the same as 7th, except a forced or Free major uses maj7.
- Sus4 replaces the third in every chord and ignores tilt.
- Accidentals keep the chord quality and only move the root.
- When the quality hand is visible it sets the quality and overrides both tilt and the Chord type picker, except for an open five-finger hand, which only adds a 7th and still follows tilt: upright uses the diatonic 7th (I maj7, V7, and so on), a minor tilt is m7, and a major tilt is a dominant 7, or maj7 if Chord type is Maj7.
- With the quality hand out of frame, tilt and the picker work as before.
- Degree 5 is still five fingers on the cyan chord hand.
- A "Quality hand" badge appears next to the chord while it is in control.
- The m7b5 shape must be held for 8 frames (other shapes 4) so it is not triggered by accident.

Inversion (Sound card, default Off): Off plays root position exactly as before. 1st, 2nd and 3rd raise the lowest chord tones by an octave (3rd only applies to 4-note chords and is clamped otherwise). Voice leading picks the inversion closest to the previous chord so chords move smoothly. Inverted chords show the bass as a slash chord, e.g. C/E, and the bass note follows the lowest chord tone.

Sound (Sound card, default Synth): Synth is the original detuned pad. Lo-fi is a soft, warm, slightly wobbly pad with faint hiss. Piano fades in over 0.9 seconds like Lo-fi, then settles to a quiet sustain and darkens as it rings. Brass is a bright sawtooth with a swelling filter and slight vibrato. All sounds are synthesized in the browser; changing Sound releases the current chord and the next chord uses the new sound.

Octave (Sound card, default 0): -1, 0, or +1 shifts the pad down or up by one octave from the default (MIDI octave 4).

Volume (Sound card, default 50): a 0 to 100 slider for overall loudness. 50 matches the original output level. The value is applied when you press Start if you change it first.

Default key is C major. Use the Key and Mode selectors to change it.

Free (no key) mode: degrees 1 to 7 play the natural roots C D E F G A B. Upright or inward tilt plays major, outward tilt plays minor. The Key selector is disabled in this mode.

## Run locally

The camera requires a secure context, so serve over localhost:

```
python -m http.server 8000
```

or

```
npx serve .
```

Each command uses its own port. `python -m http.server 8000` serves on http://localhost:8000, and `npx serve .` serves on http://localhost:3000 by default (add `-l 8000` to use 8000 instead). The page only loads while that command is running. Open the matching localhost address, press Start, and allow camera access.

If the status says the camera needs a secure page, open the localhost address instead of the Network IP address that `serve` also prints. Tracking and sound pause while the tab is hidden. After starting, the button becomes Stop, which silences the pad, turns off the camera and pauses audio; press Start to resume. A light limiter on the output keeps loud chords from clipping. Key, Mode, Chord type, Inversion, Sound, Octave and Volume are saved in your browser (localStorage) and restored on the next visit; Inversion starts Off and Octave starts at 0 on a first visit.

## Tests

Run `npm test` (Node 18 or newer). The suite uses the built-in `node:test` runner and has no dependencies.

## Privacy

All processing happens in your browser. Video never leaves your machine. After a clone, the hand tracker runs offline from files vendored in `vendor/`.

## Vendored MediaPipe

Signa vendors MediaPipe Tasks Vision 0.10.14 (Apache License 2.0; see `vendor/mediapipe/0.10.14/LICENSE`) plus the float16 hand landmarker model in `vendor/models/`. You do not need a network connection to load the tracker after cloning.

To update these files:

1. Run `npm pack @mediapipe/tasks-vision@<version>` and copy `vision_bundle.mjs` plus the `wasm/` folder into `vendor/mediapipe/<version>/`.
2. Download `hand_landmarker.task` (float16/1) from MediaPipe's model storage into `vendor/models/`.
3. Copy the Apache 2.0 license into `vendor/mediapipe/<version>/LICENSE`.
4. Point the version path in `js/hands.js` at the new folder.


## Tuning

Constants live in `js/gestures.js` (tilt dead zone, tilt threshold, stable frames) and `js/synth.js` (attack, release).

## Roadmap

These are planned, not built yet:

- Volume, distortion, and waveform controls on the orange quality hand (the second hand, drawn orange in the camera view)
- A metronome
