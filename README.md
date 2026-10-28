# Signa

Signa is a browser app that turns left-hand gestures in front of your webcam into sustained pad chords. It is an original implementation inspired by the Air Chord idea; no code or assets were copied from other projects.

## Gestures (left hand)

| Gesture | Result |
| --- | --- |
| 1 to 5 extended fingers | Scale degree 1 to 5 |
| Rock sign (index + pinky, thumb tucked) | Degree 6 |
| I-love-you sign (thumb + index + pinky) | Degree 7 |
| Fist | Mute (release) |
| Hand upright | Diatonic chord for the degree |
| Tilt inward (toward body center) | Force major |
| Tilt outward | Force minor |
| Hand in top band of the frame | Sharp (root up a semitone) |
| Hand in middle band | Natural |
| Hand in bottom band | Flat (root down a semitone) |

### Quality hand (the second hand, drawn orange)

| Shape | Quality |
| --- | --- |
| Fist or 3 fingers | Major |
| 1 finger | Minor |
| 2 fingers | add9 |
| 4 fingers | sus4 |
| 5 fingers | Dominant 7 |
| Index + ring + pinky (thumb and middle down) | m7b5 |
| Absent | Fall back to tilt and Chord type |

Chord type: Triad plays 3-note chords. 7th plays diatonic 7ths when upright (I maj7, ii m7, iii m7, IV maj7, V7, vi m7, vii m7b5), dominant 7 for forced or Free major, and m7 for minor. Maj7 is the same but uses maj7 for forced or Free major. Accidentals keep the chord quality and only move the root. Sus4 replaces the third in every chord and ignores tilt; accidentals still apply. When the quality hand is visible it sets the quality and overrides both tilt and the Chord type picker; accidentals still apply. With it out of frame, tilt and the picker work as before. A "Quality hand" badge appears next to the chord while it is in control. The m7b5 shape must be held for 8 frames (other shapes 4) so it is not triggered by accident.

Inversion (Sound card, default Off): Off plays root position exactly as before. 1st, 2nd and 3rd raise the lowest chord tones by an octave (3rd only applies to 4-note chords and is clamped otherwise). Voice leading picks the inversion closest to the previous chord so chords move smoothly. Inverted chords show the bass as a slash chord, e.g. C/E, and the bass note follows the lowest chord tone.

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

Then open http://localhost:8000 (or the URL `serve` prints) and press Start. Allow camera access.

If the status says the camera needs a secure page, open http://localhost:8000 instead of the Network IP address that `serve` also prints. Tracking and sound pause while the tab is hidden.

## Privacy

All processing happens in your browser. Video never leaves your machine. The only network requests are to download the MediaPipe library (jsdelivr) and hand model (storage.googleapis.com).

## Tuning

Constants live in `js/gestures.js` (tilt dead zone, tilt threshold, stable frames) and `js/synth.js` (attack, release).
