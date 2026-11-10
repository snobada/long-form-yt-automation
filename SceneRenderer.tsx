import {loadFont as loadCookie} from "@remotion/google-fonts/Cookie";
import {loadFont as loadPatrickHand} from "@remotion/google-fonts/PatrickHand";

import React from "react";
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Background} from "../components/Background";
import {
  countUpText,
  pop,
  progress,
  reveal,
  smooth,
  stagger,
} from "../animation/presets";
import {theme} from "../theme/theme";
import {SceneTiming} from "./timing";
import {Scene} from "./types";

// Remotion Studio generated Google Font loading
loadCookie("normal", {
  weights: ["400"],
  subsets: ["latin"]
});

const {fontFamily: captionFont} = loadPatrickHand("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

const headingStyle: React.CSSProperties = {
  fontFamily: theme.fonts.heading,
  fontWeight: 800,
  color: theme.colors.text,
  lineHeight: 1.1,
};

const bodyStyle: React.CSSProperties = {
  fontFamily: theme.fonts.body,
  color: theme.colors.muted,
};

const TitleLayout: React.FC<{scene: Scene; accent: string}> = ({
  scene,
  accent,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 160,
      }}
    >
      <div style={{...headingStyle, fontSize: 128, ...reveal(frame, fps, 0, "up")}}>
        {scene.title}
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: accent,
          marginTop: 40,
          width: 320 * smooth(frame, fps, 10),
        }}
      />
      {scene.subtitle ? (
        <div
          style={{
            ...bodyStyle,
            fontSize: 48,
            marginTop: 40,
            ...reveal(frame, fps, 20, "up", 30),
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const BulletsLayout: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        padding: "120px 160px",
        fontFamily: "Cookie"
      }}
    >
      <div style={{...headingStyle, fontSize: 84, ...reveal(frame, fps, 0, "right")}}>
        {scene.title}
      </div>
      <div style={{marginTop: 70, display: "flex", flexDirection: "column", gap: 28}}>
        {scene.bullets.map((b, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 30,
              padding: "26px 36px",
              borderRadius: 24,
              background: theme.colors.card,
              border: `2px solid ${theme.colors.cardBorder}`,
              ...reveal(frame, fps, 15 + stagger(i, 12), "left", 80),
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: theme.colors.primary,
                color: "#fff",
                fontFamily: theme.fonts.heading,
                fontWeight: 700,
                fontSize: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div style={{...headingStyle, fontWeight: 600, fontSize: 54}}>{b}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const DiagramLayout: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const items = scene.diagram?.items ?? [];
  return (
    <AbsoluteFill style={{padding: "120px 100px"}}>
      <div style={{...headingStyle, fontSize: 84, textAlign: "center", ...reveal(frame, fps, 0, "down")}}>
        {scene.title}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                minWidth: 260,
                padding: "40px 30px",
                textAlign: "center",
                borderRadius: 28,
                background: theme.colors.card,
                border: `2px solid ${theme.colors.cardBorder}`,
                transform: `scale(${pop(frame, fps, 15 + stagger(i, 14))})`,
              }}
            >
              <div style={{...headingStyle, fontWeight: 700, fontSize: 48}}>
                {item.label}
              </div>
              {item.caption ? (
                <div style={{...bodyStyle, fontSize: 28, marginTop: 12}}>
                  {item.caption}
                </div>
              ) : null}
            </div>
            {i < items.length - 1 ? (
              <div
                style={{
                  fontSize: 64,
                  color: theme.colors.accent,
                  opacity: smooth(frame, fps, 22 + stagger(i, 14)),
                }}
              >
                →
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const PhotoLayout: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{padding: "120px 160px"}}>
      <div style={{...headingStyle, fontSize: 84, ...reveal(frame, fps, 0, "right")}}>
        {scene.title}
      </div>
      <div
        style={{
          marginTop: 60,
          flex: 1,
          borderRadius: 32,
          border: `3px dashed ${theme.colors.cardBorder}`,
          background: theme.colors.card,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          ...bodyStyle,
          fontSize: 40,
          ...reveal(frame, fps, 10, "scale"),
        }}
      >
        Photo placeholder: {scene.photo?.file ?? "none"} (Stage 3)
      </div>
    </AbsoluteFill>
  );
};

const StatLayout: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = progress(frame, 10, 60);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 160,
      }}
    >
      <div style={{...headingStyle, fontSize: 70, fontWeight: 600, color: theme.colors.muted, ...reveal(frame, fps, 0, "down")}}>
        {scene.title}
      </div>
      <div
        style={{
          ...headingStyle,
          fontSize: 300,
          color: theme.colors.accent,
          transform: `scale(${0.9 + 0.1 * pop(frame, fps, 5)})`,
        }}
      >
        {scene.stat ? countUpText(scene.stat.value, p) : ""}
      </div>
      <div style={{...bodyStyle, fontSize: 56, ...reveal(frame, fps, 30, "up", 30)}}>
        {scene.stat?.label}
      </div>
    </AbsoluteFill>
  );
};

const FADE_FRAMES = 12;
const WORDS_PER_CAPTION = 7;

const ImageLayout: React.FC<{timing: SceneTiming; captions: boolean}> = ({
  timing,
  captions,
}) => {
  const {scene} = timing;
  const frame = useCurrentFrame();
  const files = [scene.imageFile, ...scene.beats.map((b) => b.imageFile)].filter(
    (f): f is string => Boolean(f),
  );
  const slice = timing.durationFrames / Math.max(files.length, 1);

  const words = scene.narration.trim().split(/\s+/).filter(Boolean);
  const chunks: {text: string; from: number}[] = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CAPTION) {
    chunks.push({
      text: words.slice(i, i + WORDS_PER_CAPTION).join(" "),
      from: i / words.length,
    });
  }
  const narrStart = timing.narrationStartFrame - timing.startFrame;
  const prog = (frame - narrStart) / Math.max(timing.narrationFrames, 1);
  let caption = "";
  if (prog >= 0) {
    for (const c of chunks) if (prog >= c.from) caption = c.text;
  }

  const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

  return (
    <AbsoluteFill style={{backgroundColor: "#000"}}>
      {files.map((f, i) => {
        const start = i * slice;
        const opacity =
          i === 0 ? 1 : interpolate(frame, [start, start + FADE_FRAMES], [0, 1], clamp);
        const t = interpolate(frame, [start, start + slice], [0, 1], clamp);
        const scale = i % 2 === 0 ? 1 + 0.08 * t : 1.08 - 0.08 * t;
        return (
          <AbsoluteFill key={f + i} style={{opacity}}>
            <Img
              src={staticFile(f)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${scale})`,
              }}
            />
          </AbsoluteFill>
        );
      })}
      {captions && caption ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 90,
            textAlign: "center",
            padding: "0 160px",
            fontFamily: captionFont,
            fontSize: 88,
            lineHeight: 1.15,
            color: "#fff",
            WebkitTextStroke: "10px #000",
            paintOrder: "stroke fill",
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{timing: SceneTiming; captions?: boolean}> = ({
  timing,
  captions = true,
}) => {
  const {scene, index} = timing;
  let content: React.ReactNode;

  switch (scene.layout) {
    case "image":
      content = <ImageLayout timing={timing} captions={captions} />;
      break;
    case "title":
      content = <TitleLayout scene={scene} accent={theme.colors.primary} />;
      break;
    case "outro":
      content = <TitleLayout scene={scene} accent={theme.colors.accent2} />;
      break;
    case "bullets":
      content = <BulletsLayout scene={scene} />;
      break;
    case "diagram":
      content = <DiagramLayout scene={scene} />;
      break;
    case "photo":
      content = <PhotoLayout scene={scene} />;
      break;
    case "stat":
      content = <StatLayout scene={scene} />;
      break;
    default:
      content = null;
  }

  return (
    <AbsoluteFill>
      <Background seed={index} />
      {content}
    </AbsoluteFill>
  );
};