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
