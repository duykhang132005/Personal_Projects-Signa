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
| Right hand, 4 fingers | sus4 modifier |
| Right hand, 2 fingers | add9 modifier (madd9 on minor) |
| Right hand, other or absent | No modifier |

Chord type: Triad plays 3-note chords. 7th plays diatonic 7ths when upright (I maj7, ii m7, iii m7, IV maj7, V7, vi m7, vii m7b5), dominant 7 for forced or Free major, and m7 for minor. Maj7 is the same but uses maj7 for forced or Free major. Accidentals keep the chord quality and only move the root. Sus4 replaces the third in every chord and ignores tilt; accidentals still apply. Right-hand modifiers override the Chord type picker (add9 drops the 7th).

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

## Privacy

All processing happens in your browser. Video never leaves your machine. The only network requests are to download the MediaPipe library (jsdelivr) and hand model (storage.googleapis.com).

## Tuning

Constants live in `js/gestures.js` (tilt dead zone, tilt threshold, stable frames) and `js/synth.js` (attack, release).
