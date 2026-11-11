import { createHandTracker, findUserLeftHand, findUserRightHand, drawHands, HAND_COLORS } from './hands.js';

const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
HAND_COLORS.chord = cssVar('--hand-chord', '#7fd');
HAND_COLORS.quality = cssVar('--hand-quality', '#ffa94d');
import { classifyDegree, classifyTilt, classifyAccidental, classifyModifier, Stabilizer, STABLE_FRAMES, M7B5_STABLE_FRAMES } from './gestures.js';
import { buildChord, invertChord, NOTE_NAMES } from './music.js';
import { PadSynth } from './synth.js';
import { isTypingTarget, shortcutAction } from './keys.js';

const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('overlay');
const ctx = canvas.getContext('2d');
const status = (t) => { $('status').textContent = t; };
const stage = $('stage');

function setChordText(t) {
  $('chord').textContent = t;
  $('hud-chord').textContent = t;
}
function setStartState(text, disabled) {
  for (const id of ['start', 'hud-start']) {
    $(id).textContent = text;
    if (disabled !== undefined) $(id).disabled = disabled;
  }
}
function keyModeLabel() {
  const mode = $('mode').value;
  if (mode === 'free') return 'Free (no key)';
  return $('key').value + ' ' + mode;
}
function syncHudMeta() { $('hud-keymode').textContent = keyModeLabel(); }


let synth, tracker;
const degStab = new Stabilizer();
const tiltStab = new Stabilizer();
const accStab = new Stabilizer();
const modStab = new Stabilizer(STABLE_FRAMES, { m7b5: M7B5_STABLE_FRAMES });
const ACC_LABEL = { '-1': 'flat', '0': 'natural', '1': 'sharp' };
let lastTilt = 'diatonic';
let playingKey = null;
let lastNotes = null;
let active = false;      // true between Start and Stop
let stream = null;
let silencedId = null;   // chord silenced by Space/Esc; stays silent until the chord changes

function keyIndex() { return NOTE_NAMES.indexOf($('key').value); }

function update(degree, tilt, acc, mod) {
  if (tilt !== 'hold' && tilt != null) lastTilt = tilt;
  if (degree == null) return;
  if (degree === 0) {
    if (playingKey !== null) { synth.release(); playingKey = null; }
    silencedId = null;
    showMuted();
    return;
  }
  const base = buildChord(keyIndex(), $('mode').value, degree, lastTilt, 4, $('ctype').value, acc || 0, mod || null);
  const c = invertChord(base, $('inv').value, lastNotes);
  const id = c.name + c.notes.join(',');
  if (silencedId !== null && id !== silencedId) silencedId = null;
  if (id !== playingKey && id !== silencedId) { synth.play(c.notes, c.bass); playingKey = id; lastNotes = c.notes; }
  $('qbadge').hidden = !mod;
  $('degree').textContent = c.free ? 'Free' + (acc ? ' ' + (acc > 0 ? '#' : 'b') : '') : degree;
  setChordText(c.free ? c.name : c.roman + ' ' + c.name);
  $('quality').textContent = c.source + (acc ? ', ' + ACC_LABEL[acc] : '');
}

let lastTime = -1;
let rafId = null;
let running = false;

function startLoop() {
  running = true;
  if (rafId === null) rafId = requestAnimationFrame(loop); // guard: one loop at a time
}

function stopLoop() {
  running = false;
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}

function loop() {
  rafId = null;
  if (!running) return;
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
      $('gesture').textContent = (raw === 0 ? 'fist' : raw) + ' / ' + t.tilt + ' (' + t.deg.toFixed(0) + ' deg) / ' + ACC_LABEL[a] + ' / Quality hand (orange): ' + (m || 'none');
      update(degStab.push(raw), tiltStab.push(t.tilt), accStab.push(a), m);
    } else {
      $('gesture').textContent = 'no chord hand';
    }
  }
  rafId = requestAnimationFrame(loop);
}

function showMuted() {
  $('degree').textContent = '-';
  setChordText('muted');
  $('quality').textContent = '-';
  $('qbadge').hidden = true;
}

// Space/Esc: release the current chord. It replays when the chord changes or after a fist.
function silence() {
  if (!synth || playingKey === null) return;
  synth.release();
  silencedId = playingKey;
  playingKey = null;
  showMuted();
}

function stopPlaying() {
  active = false;
  stopLoop();
  if (synth) synth.release();
  playingKey = null; silencedId = null; degStab.value = null;
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  showMuted();
  $('gesture').textContent = '-';
  // Suspend after the release fade so restarting does not replay a frozen tail.
  setTimeout(() => { if (!active && synth) synth.suspend(); }, 1600);
  setStartState('Start playing');
  status('Stopped. Press Start to play again.');
}

$('start').addEventListener('click', async () => {
  if (active) { stopPlaying(); return; }
  setStartState($('start').textContent, true);
  try {
    if (!synth) synth = new PadSynth();
    synth.setPreset($('sound').value);
    await synth.resume();
    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      status('Camera needs a secure page. Open it via http://localhost:8000 (not the Network IP).');
      setStartState('Start playing', false);
      return;
    }
    status('Starting camera...');
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
    video.srcObject = stream;
    await video.play();
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    layoutPreview();
    status('Loading hand model...');
    if (!tracker) tracker = await createHandTracker();
    active = true;
    setStartState('Stop');
    status('Ready. Show your chord hand (cyan).');
    if (!document.hidden) startLoop();
  } catch (e) {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    status(cameraErrorMessage(e));
  }
  setStartState($('start').textContent, false);
});

function cameraErrorMessage(e) {
  switch (e && e.name) {
    case 'NotAllowedError':
    case 'SecurityError': return 'Camera permission denied. Allow camera access in your browser.';
    case 'NotFoundError':
    case 'OverconstrainedError': return 'No camera found.';
    case 'NotReadableError': return 'Camera is in use by another app.';
    default: return 'Error: ' + (e && e.message ? e.message : e);
  }
}

// Pause tracking and silence the pad while the tab is hidden.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopLoop();
    if (synth) synth.release();
    playingKey = null; // chord retriggers on return
  } else if (active && tracker) {
    startLoop(); // never restarts while stopped
  }
});

function fsElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}
function inFullscreen() {
  return fsElement() === stage || document.body.classList.contains('is-fullscreen');
}
function layoutPreview() {
  if (!inFullscreen()) {
    for (const el of [video, canvas]) {
      el.style.width = el.style.height = el.style.left = el.style.top = el.style.right = el.style.bottom = '';
    }
    return;
  }
  const sw = stage.clientWidth, sh = stage.clientHeight;
  const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
  const scale = Math.min(sw / vw, sh / vh);
  const w = Math.max(1, vw * scale), h = Math.max(1, vh * scale);
  const left = (sw - w) / 2, top = (sh - h) / 2;
  for (const el of [video, canvas]) {
    el.style.width = w + 'px';
    el.style.height = h + 'px';
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }
  if (video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

let fsOpener = null;
function syncFsUi() {
  const on = inFullscreen();
  const btn = $('fs-toggle');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.textContent = on ? 'Exit full screen' : 'Full screen';
  btn.setAttribute('aria-label', on ? 'Exit full screen camera' : 'Full screen camera');
  $('hud').hidden = !on;
  layoutPreview();
  if (!on && fsOpener && typeof fsOpener.focus === 'function') {
    fsOpener.focus();
    fsOpener = null;
  }
}

async function exitFullscreen() {
  const el = fsElement();
  if (el) {
    const fn = document.exitFullscreen || document.webkitExitFullscreen;
    try { if (fn) await fn.call(document); } catch (e) { /* already left */ }
  }
  document.body.classList.remove('is-fullscreen');
  syncFsUi();
}

async function enterFullscreen() {
  fsOpener = document.activeElement;
  const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
  if (req) {
    try {
      await req.call(stage);
      syncFsUi();
      return;
    } catch (e) { /* use the CSS fallback below */ }
  }
  document.body.classList.add('is-fullscreen');
  syncFsUi();
}

function toggleFullscreen() {
  return inFullscreen() ? exitFullscreen() : enterFullscreen();
}

document.addEventListener('fullscreenchange', syncFsUi);
document.addEventListener('webkitfullscreenchange', syncFsUi);
window.addEventListener('resize', layoutPreview);
if (window.visualViewport) visualViewport.addEventListener('resize', layoutPreview);
$('fs-toggle').addEventListener('click', toggleFullscreen);
$('hud-exit').addEventListener('click', exitFullscreen);
$('hud-start').addEventListener('click', () => $('start').click());

document.addEventListener('keydown', (e) => {
  const action = shortcutAction(e.key, {
    typing: isTypingTarget(document.activeElement),
    fullscreen: inFullscreen()
  });
  if (!action) return;
  if (action === 'silence') {
    if (e.key === ' ') e.preventDefault();
    silence();
    return;
  }
  if (action === 'toggle-fs') {
    e.preventDefault();
    toggleFullscreen();
    return;
  }
  if (action === 'exit-fs') {
    if (!fsElement()) {
      e.preventDefault();
      exitFullscreen();
    }
    // Native full screen: let the browser handle Esc; fullscreenchange syncs the UI.
  }
});


const rekey = () => {
  if (synth) synth.setPreset($('sound').value);
  playingKey = null; lastNotes = null; degStab.value = null;
  $('key').disabled = $('mode').value === 'free';
  syncHudMeta();
};
// Persist Key, Mode, Chord type, Inversion and Sound. Missing or invalid values fall back to HTML defaults.
const SETTINGS_KEY = 'signa.settings';
const SETTING_IDS = ['key', 'mode', 'ctype', 'inv', 'sound'];

function restoreSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
    for (const id of SETTING_IDS) {
      const v = saved[id];
      const sel = $(id);
      if (typeof v === 'string' && Array.from(sel.options).some(o => o.value === v)) sel.value = v;
    }
  } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
}

function saveSettings() {
  try {
    const out = {};
    for (const id of SETTING_IDS) out[id] = $(id).value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(out));
  } catch (e) { /* storage unavailable: ignore */ }
}

for (const id of SETTING_IDS) {
  $(id).addEventListener('change', () => { saveSettings(); rekey(); });
}
restoreSettings();
rekey();
window.addEventListener('pageshow', rekey);
