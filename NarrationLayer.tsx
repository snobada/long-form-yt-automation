import React from "react";
import {Html5Audio, Sequence, staticFile} from "remotion";
import {SceneTiming} from "./timing";

export const NarrationLayer: React.FC<{timeline: SceneTiming[]}> = ({
  timeline,
}) => {
  return (
    <>
      {timeline.map((t) => {
        const {scene} = t;
        if (!scene.narrationFile || scene.audioDurationSec === undefined) {
          return null;
        }
        return (
          <Sequence
            key={`narration-${scene.id}`}
            name={`voice-${scene.id}`}
            layout="none"
            from={t.narrationStartFrame}
            durationInFrames={t.narrationFrames + 2}
          >
            <Html5Audio
              src={staticFile(`audio/narration/${scene.narrationFile}`)}
            />
          </Sequence>
        );
      })}
    </>
  );
};