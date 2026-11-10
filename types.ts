import {z} from "zod";

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;

export const LAYOUTS = [
  "image",
  "title",
  "bullets",
  "diagram",
  "photo",
  "stat",
  "outro",
] as const;

export const TRANSITIONS = ["fade", "slide", "wipe", "none"] as const;

export const CAMERA_MOVES = [
  "none",
  "zoomIn",
  "zoomOut",
  "panLeft",
  "panRight",
] as const;

export const DIAGRAM_TYPES = ["flow", "cycle", "bar", "timeline"] as const;

const diagramItemSchema = z.object({
  label: z.string(),
  caption: z.string().optional(),
  value: z.number().optional(),
  icon: z.string().optional(),
});

const diagramSchema = z.object({
  type: z.enum(DIAGRAM_TYPES),
  items: z.array(diagramItemSchema).min(2).max(8),
});

const photoSchema = z.object({
  file: z.string(), // file name inside public/images
  credit: z.string().default(""),
  license: z.string().default(""),
  sourceUrl: z.string().default(""),
});

const statSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const sfxSchema = z.object({
  file: z.string(), // file name inside public/audio/sfx
  atSec: z.number().min(0), // seconds after the scene's narration starts
  volume: z.number().min(0).max(1).default(0.5),
});

export const sceneSchema = z.object({
  id: z.string(),
  layout: z.enum(LAYOUTS).default("image"),
  title: z.string().default(""),
  subtitle: z.string().optional(),
  narration: z.string(),
  visualDescription: z.string().default(""),
  keywords: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  icon: z.string().optional(),
  diagram: diagramSchema.optional(),
  photo: photoSchema.optional(),
  stat: statSchema.optional(),
  camera: z.enum(CAMERA_MOVES).default("zoomIn"),
  transitionIn: z.enum(TRANSITIONS).default("fade"),
  sfx: z.array(sfxSchema).default([]),
  // Filled automatically by scripts/generate-narration.mjs
  narrationFile: z.string().optional(), // file name inside public/audio/narration
  audioDurationSec: z.number().optional(),
  // Optional manual minimum scene length
  durationSec: z.number().optional(),
  chapter: z.number().optional(),
  imagePrompt: z.string().optional(),
  imageFile: z.string().optional(),
  beats: z
    .array(
      z.object({
        imagePrompt: z.string().optional(),
        imageFile: z.string().optional(),
        keyword: z.string().optional(),
      }),
    )
    .default([]),
});

export const videoDataSchema = z.object({
  meta: z.object({
    title: z.string(),
    topic: z.string(),
    language: z.string().default("en"),
    targetDurationSec: z.number().default(180),
    
  }),
  music: z
    .object({
      file: z.string(), // file name inside public/audio/music
      volume: z.number().min(0).max(1).default(0.12),
      duckedVolume: z.number().min(0).max(1).default(0.04),
    })
    .optional(),
  subtitles: z.object({enabled: z.boolean().default(true)}).default({}),
  scenes: z.array(sceneSchema).min(1),
});

export type Scene = z.infer<typeof sceneSchema>;
export type VideoData = z.infer<typeof videoDataSchema>;
export type LayoutName = (typeof LAYOUTS)[number];

export const parseVideoData = (raw: unknown): VideoData =>
  videoDataSchema.parse(raw);