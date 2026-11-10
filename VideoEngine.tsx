import {loadFont as loadBlackOpsOne} from "@remotion/google-fonts/BlackOpsOne";
import React, {useMemo} from "react";
import {AbsoluteFill, Sequence} from "remotion";
import {CameraMove} from "../animation/CameraMove";
import {SceneTransition} from "../animation/Transitions";
import {theme} from "../theme/theme";
import {MusicLayer} from "./MusicLayer";
import {NarrationLayer} from "./NarrationLayer";
import {SceneRenderer} from "./SceneRenderer";
import {SfxLayer} from "./SfxLayer";
import {TRANSITION_FRAMES, buildTimeline} from "./timing";
import {VideoData} from "./types";

// Remotion Studio generated Google Font loading
loadBlackOpsOne("normal", {
  weights: ["400"],
  subsets: ["latin"]
});

export type EngineProps = {
  data: VideoData;
};

export const VideoEngine: React.FC<EngineProps> = ({data}) => {
  const timeline = useMemo(() => buildTimeline(data), [data]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bg,
        color: "#c61414",
        fontFamily: "Black Ops One"
      }}
    >
      {timeline.map((t) => (
        <Sequence
          key={t.scene.id}
          name={t.scene.id}
          from={t.startFrame}
          durationInFrames={t.durationFrames}
        >
          <SceneTransition
            type={t.index === 0 ? "none" : t.scene.transitionIn}
            frames={TRANSITION_FRAMES}
          >
            <CameraMove move={t.scene.layout === "image" ? "none" : t.scene.camera}>
              <SceneRenderer timing={t} captions={data.subtitles.enabled} />
            </CameraMove>
          </SceneTransition>
        </Sequence>
      ))}

      <NarrationLayer timeline={timeline} />
      {data.music ? <MusicLayer music={data.music} timeline={timeline} /> : null}
      <SfxLayer timeline={timeline} />
    </AbsoluteFill>
  );
};