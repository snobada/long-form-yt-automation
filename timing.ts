import {Scene, VideoData, VIDEO_FPS} from "./types";

export const WORDS_PER_SECOND = 2.5; // fallback estimate for narration speed
export const LEAD_IN_SEC = 0.4; // silence before narration starts
export const TAIL_SEC = 0.8; // hold after narration ends
export const MIN_SCENE_SEC = 3;
export const TRANSITION_FRAMES = 15;

export type SceneTiming = {
  scene: Scene;
  index: number;
  startFrame: number; // where the scene sequence begins (overlaps previous)
  durationFrames: number; // sequence length (includes incoming transition)
  narrationStartFrame: number; // absolute frame where narration audio starts
  narrationFrames: number; // narration length in frames
};

export const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

export const narrationSeconds = (scene: Scene): number =>
  scene.audioDurationSec ?? countWords(scene.narration) / WORDS_PER_SECOND;

const baseSceneSeconds = (scene: Scene): number => {
  const speech = narrationSeconds(scene) + LEAD_IN_SEC + TAIL_SEC;
  return Math.max(speech, scene.durationSec ?? 0, MIN_SCENE_SEC);
};

export const buildTimeline = (
  data: VideoData,
  fps: number = VIDEO_FPS,
): SceneTiming[] => {
  const timeline: SceneTiming[] = [];
  let cursor = 0; // frame where the next scene's visible time begins

  data.scenes.forEach((scene, index) => {
    const hasIncoming = index > 0;
    const baseFrames = Math.ceil(baseSceneSeconds(scene) * fps);
    const durationFrames = baseFrames + (hasIncoming ? TRANSITION_FRAMES : 0);
    const startFrame = hasIncoming ? cursor - TRANSITION_FRAMES : cursor;
    const narrationStartFrame =
      startFrame +
      (hasIncoming ? TRANSITION_FRAMES : 0) +
      Math.round(LEAD_IN_SEC * fps);

    timeline.push({
      scene,
      index,
      startFrame,
      durationFrames,
      narrationStartFrame,
      narrationFrames: Math.ceil(narrationSeconds(scene) * fps),
    });

    cursor = startFrame + durationFrames;
  });

  return timeline;
};

export const getTotalFrames = (
  data: VideoData,
  fps: number = VIDEO_FPS,
): number => {
  const timeline = buildTimeline(data, fps);
  const last = timeline[timeline.length - 1];
  return last.startFrame + last.durationFrames;
};