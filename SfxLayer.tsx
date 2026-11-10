import React from "react";
import {Html5Audio, Sequence, staticFile, useVideoConfig} from "remotion";
import {SceneTiming} from "./timing";

export const SfxLayer: React.FC<{timeline: SceneTiming[]}> = ({timeline}) => {
  const {fps} = useVideoConfig();
  return (
    <>
      {timeline.flatMap((t) =>
        t.scene.sfx.map((s, i) => (
          <Sequence
            key={`sfx-${t.scene.id}-${i}`}
            name={`sfx-${t.scene.id}-${i}`}
            layout="none"
            from={t.narrationStartFrame + Math.round(s.atSec * fps)}
          >
            <Html5Audio src={staticFile(`audio/sfx/${s.file}`)} volume={s.volume} />
          </Sequence>
        )),
      )}
    </>
  );
};