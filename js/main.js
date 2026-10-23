import { createHandTracker, findUserLeftHand, findUserRightHand, drawHands } from './hands.js';
import { classifyDegree, classifyTilt, classifyAccidental, classifyModifier, Stabilizer } from './gestures.js';
import { buildChord, NOTE_NAMES } from './music.js';
import { PadSynth } from './synth.js';

const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('overlay');
const ctx = canvas.getContext('2d');
const status = (t) => { $('status').textContent = t; };

let synth, tracker;
const degStab = new Stabilizer();
const tiltStab = new Stabilizer();
const accStab = new Stabilizer();
const modStab = new Stabilizer();
const ACC_LABEL = { '-1': 'flat', '0': 'natural', '1': 'sharp' };
let lastTilt = 'diatonic';
let playingKey = null;

function keyIndex() { return NOTE_NAMES.indexOf($('key').value); }

function update(degree, tilt, acc, mod) {
  if (tilt !== 'hold' && tilt != null) lastTilt = tilt;
  if (degree == null) return;
  if (degree === 0) {
    if (playingKey !== null) { synth.release(); playingKey = null; }
    $('degree').textContent = '-';
    $('chord').textContent = 'muted';
    $('quality').textContent = '-';
    return;
  }
  const c = buildChord(keyIndex(), $('mode').value, degree, lastTilt, 4, $('ctype').value, acc || 0, mod || null);
  const id = c.name + c.notes.join(',');
  if (id !== playingKey) { synth.play(c.notes, c.bass); playingKey = id; }
  $('degree').textContent = c.free ? 'Free' + (acc ? ' ' + (acc > 0 ? '#' : 'b') : '') : degree;
  $('chord').textContent = c.free ? c.name : c.roman + ' ' + c.name;
  $('quality').textContent = c.source + (acc ? ', ' + ACC_LABEL[acc] : '');
}

let lastTime = -1;
function loop() {
  if (video.readyState >= 2 && video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    const result = tracker.detectForVideo(video, performance.now());
    const left = findUserLeftHand(result);
    const right = findUserRightHand(result);
    drawHands(ctx, result, left, right);
    const m = modStab.push(classifyModifier(right));
    if (left) {
      const raw = classifyDegree(left);
      const t = classifyTilt(left);
      const a = classifyAccidental(left, accStab.value || 0);
      $('gesture').textContent = (raw === 0 ? 'fist' : raw) + ' / ' + t.tilt + ' (' + t.deg.toFixed(0) + ' deg) / ' + ACC_LABEL[a] + ' / Hand: ' + (m || 'none');
      update(degStab.push(raw), tiltStab.push(t.tilt), accStab.push(a), m);
    } else {
      $('gesture').textContent = 'no left hand';
    }
  }
  requestAnimationFrame(loop);
}

$('start').addEventListener('click', async () => {
  $('start').disabled = true;
  try {
    synth = new PadSynth();
    await synth.resume();
    status('Starting camera...');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    status('Loading hand model...');
    tracker = await createHandTracker();
    status('Ready. Show your left hand.');
    loop();
  } catch (e) {
    status('Error: ' + e.message);
    $('start').disabled = false;
  }
});

const rekey = () => {
  playingKey = null; degStab.value = null;
  $('key').disabled = $('mode').value === 'free';
};
$('key').addEventListener('change', rekey);
$('mode').addEventListener('change', rekey);
$('ctype').addEventListener('change', rekey);
rekey();
window.addEventListener('pageshow', rekey);
