import React from "react";
import {Html5Audio, interpolate, staticFile, useVideoConfig} from "remotion";
import {SceneTiming} from "./timing";
import {VideoData} from "./types";

const RAMP = 15; // frames to fade music down/up around narration
const FADE_IN = 45;
const FADE_OUT = 90;
const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const MusicLayer: React.FC<{
  music: NonNullable<VideoData["music"]>;
  timeline: SceneTiming[];
}> = ({music, timeline}) => {
  const {durationInFrames} = useVideoConfig();
  const windows = timeline
    .filter((t) => t.scene.narrationFile)
    .map((t) => [t.narrationStartFrame, t.narrationStartFrame + t.narrationFrames] as const);

  const volume = (f: number) => {
    let d = 9999; // distance (frames) to the nearest narration
    for (const [s, e] of windows) {
      const dist = f < s ? s - f : f > e ? f - e : 0;
      if (dist < d) d = dist;
    }
    const level = interpolate(d, [0, RAMP], [music.duckedVolume, music.volume], clamp);
    const fadeIn = interpolate(f, [0, FADE_IN], [0, 1], clamp);
    const fadeOut = interpolate(f, [durationInFrames - FADE_OUT, durationInFrames], [1, 0], clamp);
    return level * fadeIn * fadeOut;
  };

  return <Html5Audio src={staticFile(`audio/music/${music.file}`)} volume={volume} loop />;
};