// MediaPipe HandLandmarker wrapper (loaded from CDN).
const VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export async function createHandTracker() {
  const { FilesetResolver, HandLandmarker } = await import(VISION_URL + '/vision_bundle.mjs');
  const fileset = await FilesetResolver.forVisionTasks(VISION_URL + '/wasm');
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numHands: 2
  });
  try {
    return await HandLandmarker.createFromOptions(fileset, opts('GPU'));
  } catch (e) {
    return await HandLandmarker.createFromOptions(fileset, opts('CPU'));
  }
}

// MediaPipe labels handedness assuming a mirrored (selfie) image. Raw webcam
// frames are not mirrored, so the label is swapped: "Right" means the user's left hand.
export const USER_LEFT_LABEL = 'Right';

export function findUserLeftHand(result) {
  if (!result || !result.landmarks) return null;
  for (let i = 0; i < result.landmarks.length; i++) {
    const h = result.handedness[i] && result.handedness[i][0];
    if (h && h.categoryName === USER_LEFT_LABEL) return result.landmarks[i];
  }
  return null;
}

const LINKS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];

// Canvas is mirrored via CSS, so draw in raw image coordinates.
export function drawHands(ctx, result, leftHand) {
  const { width: w, height: h } = ctx.canvas;
  ctx.clearRect(0, 0, w, h);
  if (!result || !result.landmarks) return;
  for (const lm of result.landmarks) {
    const isLeft = lm === leftHand;
    ctx.strokeStyle = isLeft ? '#7fd' : '#666';
    ctx.lineWidth = isLeft ? 3 : 2;
    ctx.beginPath();
    for (const [a, b] of LINKS) {
      ctx.moveTo(lm[a].x * w, lm[a].y * h);
      ctx.lineTo(lm[b].x * w, lm[b].y * h);
    }
    ctx.stroke();
    ctx.fillStyle = isLeft ? '#fff' : '#999';
    for (const p of lm) {
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
