import { createHandTracker, findUserLeftHand, drawHands } from './hands.js';
import { classifyDegree, classifyTilt, Stabilizer } from './gestures.js';
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
let lastTilt = 'diatonic';
let playingKey = null;

function keyIndex() { return NOTE_NAMES.indexOf($('key').value); }

function update(degree, tilt) {
  if (tilt !== 'hold' && tilt != null) lastTilt = tilt;
  if (degree == null) return;
  if (degree === 0) {
    if (playingKey !== null) { synth.release(); playingKey = null; }
    $('degree').textContent = '-';
    $('chord').textContent = 'muted';
    $('quality').textContent = '-';
    return;
  }
  const c = buildChord(keyIndex(), $('mode').value, degree, lastTilt);
  const id = c.name + c.notes.join(',');
  if (id !== playingKey) { synth.play(c.notes, c.bass); playingKey = id; }
  $('degree').textContent = c.free ? 'Free' : degree;
  $('chord').textContent = c.free ? c.name : c.roman + ' ' + c.name;
  $('quality').textContent = c.source;
}

let lastTime = -1;
function loop() {
  if (video.readyState >= 2 && video.currentTime !== lastTime) {
    lastTime = video.currentTime;
    const result = tracker.detectForVideo(video, performance.now());
    const left = findUserLeftHand(result);
    drawHands(ctx, result, left);
    if (left) {
      const raw = classifyDegree(left);
      const t = classifyTilt(left);
      $('gesture').textContent = (raw === 0 ? 'fist' : raw) + ' / ' + t.tilt + ' (' + t.deg.toFixed(0) + ' deg)';
      update(degStab.push(raw), tiltStab.push(t.tilt));
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
