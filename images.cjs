const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// ===================== STYLE SYSTEM =====================
// Default look is "story". Switch with:  $env:SD_STYLE="whiteboard"
// Measurable scenes: put [LABEL: 8 MINUTES] at the end of an imagePrompt to get a hand-lettered label with an arrow.

const CHARACTER_STORY = "a tall slender stick-figure man (a huge perfectly round white head with a thin black outline, two large round white eyes with thin outlines and small solid black pupils, no nose, a tiny simple mouth (wide open with a coral tongue when shouting), a medium-blue short-sleeve t-shirt, thin solid black arms with simple black mitten hands, long straight blue-gray jeans, white sneakers)";
const CHARACTER_WB = "a stick-figure man with a large round white head, two tiny black dot eyes, a small curved smile, a blue t-shirt, blue jeans and white sneakers";

const MAN_RE = /a stick-figure man(?: with a large round white head, two tiny black dot eyes, a small curved smile, a blue t-shirt, blue jeans and white sneakers| with a big round white head, tiny black dot eyes, a small smile, a blue t-shirt, blue jeans and white sneakers| in a blue t-shirt and blue jeans)?/gi;
const KID_RE = /\b(?:the|a)\s+(?:(?:sleepy|small|cartoon|smiling)\s+)*kid(?: with round glasses)?(?: and an orange hoodie| in an orange hoodie)?/gi;
const NO_GLOW = /\b(?:softly |warmly |brightly )?glowing\s*/gi;
const NO_WHITE_SPACE = /(?:\band\s+)?\blots of (?:empty )?white space\b[^.]*\.?/gi;

const textBlock = labels =>
  ` The only text in the picture is the English words "${labels.join('" and "')}" written in neat hand-lettered black uppercase sans-serif capitals with even strokes, on a plain pale area of empty space, with a thin black arrow with an open V arrowhead pointing from the text to the labelled object. No other text.`;

const STYLES = {
  story: {
    style: "Clean 2D animated storybook cartoon frame. Line art: thin, even, confident dark outlines about 1.5 px wide on every object, never thick, bold or marker-like, rounded corners, no sketchy double lines, no hatching. Color: bright, slightly warm natural palette: clear sky blue, greens from deep teal to yellow-green, warm brown, tan, beige, stone gray, cream. Shading: flat base colors with soft two-tone cel shading (one shadow tone, one highlight tone) and smooth gradients only in skies and distance, no heavy texture. Scenery: a complete simple backdrop in layers: foreground rocks, grass tufts and tree branches, a middle ground, and a hazy pale distance with lighter blue-purple mountains and few outlines; blue gradient sky with white clouds that have pale blue undersides; foliage as clustered scalloped leaf shapes; angular gray rocks with dark crack lines; tan dirt paths. The main subject is large and clear, about half the frame, with no clutter. ",
    suffix: " No text, no letters, no numbers, no writing, no logos, no watermark. Not photorealistic, not anime, not 3D, no painterly texture, no neon colors, no thick outlines, no dark mood.",
    suffixText: " No logos, no watermark. Not photorealistic, not anime, not 3D, no painterly texture, no neon colors, no thick outlines.",
    tidy: p => p
      .replace(MAN_RE, CHARACTER_STORY)
      .replace(KID_RE, CHARACTER_STORY)
      .replace(NO_GLOW, "")
      .replace(NO_WHITE_SPACE, "")
  },
  whiteboard: {
    style: "Hand-drawn whiteboard explainer frame, like a frame from a YouTube science animation. Pure flat white background (#FFFFFF), completely empty: no floor, no ground line, no shadow, no wall, no room, no paper texture, no vignette. Thin sketchy black pen outlines about 2px wide, slightly wobbly and imperfect, with flat pastel color fills (soft blue, pale green, light gray, light brown, pale yellow, muted red), no hatching, no crayon texture, no gradients, no glow. Simple rounded shapes. Exactly one main subject centered in the frame, plus at most two small supporting objects, with a lot of empty white space around. Human characters have a large perfectly round white head with a thin black outline, two tiny black dot eyes, a small curved line mouth, and thin stick arms and legs. ",
    suffix: " Draw only the objects and characters named above, on plain white, ignoring any setting, sky or background. Nothing else in the picture: no furniture, no room, no decorations, no speech bubbles, no icons. A wordless illustration: no text, no letters, no numbers, no writing, no watermark. Not photorealistic, not 3D, no lighting effects.",
    suffixText: " Draw only the objects and characters named above, on plain white. No furniture, no room, no decorations, no speech bubbles. Not photorealistic, not 3D, no lighting effects, no watermark.",
    tidy: p => p
      .replace(MAN_RE, CHARACTER_WB)
      .replace(KID_RE, CHARACTER_WB)
      .replace(NO_GLOW, "")
      .replace(/,\s*[^,]*\b(?:light|glow|lighting)\b[^,]*$/i, "")
      .replace(/\s+at night\b/gi, "")
      .replace(/\b(?:sunny|sunlit|dark|darkening|stormy|starry|dreamy)\s+/gi, "")
  }
};
const MODE = (process.env.SD_STYLE || "story").toLowerCase();
const ACTIVE = STYLES[MODE] || STYLES.story;
const STYLE = ACTIVE.style;

const LABEL_RE = /\[LABEL:\s*([^\]]+)\]/gi;
const stripLabels = p => p.replace(LABEL_RE, "").replace(/\s+/g, " ").trim();
function buildPrompt(raw) {
  const labels = [];
  const body = raw.replace(LABEL_RE, (_, t) => { labels.push(t.trim()); return ""; }).trim();
  let scene = ACTIVE.tidy(body).replace(/\s+/g, " ").replace(/[,;:\s]+$/, "").trim();
  if (!/[.!?]$/.test(scene)) scene += ".";
  return ACTIVE.style + scene + (labels.length ? textBlock(labels) + ACTIVE.suffixText : ACTIVE.suffix);
}
// ========================================================
const COMFY = "http://127.0.0.1:8188";

const args = process.argv.slice(2);
const useComfy = args.includes("--comfy");
const useLocal = args.includes("--local");
const force = args.includes("--force");
const only = args.find(a => !a.startsWith("--"));

const root = path.resolve(__dirname, "..");

// ---- Local (stable-diffusion.cpp) settings ----
const SD_DIR = path.join(root, "sd");
const SD_EXE = ["sd-cli.exe", "sd.exe"].map(f => path.join(SD_DIR, f)).find(f => fs.existsSync(f));
const MODELS = {
  diffusion: path.join(SD_DIR, "models", "z_image_turbo-Q4_K.gguf"),
  vae: path.join(SD_DIR, "models", "ae.safetensors"),
  llm: path.join(SD_DIR, "models", "Qwen3-4B-Instruct-2507-Q4_K_M.gguf"),
};
const W = process.env.SD_W || "1280";
const H = process.env.SD_H || "720";
const STEPS = process.env.SD_STEPS || "8";

const MODEL = useLocal
  ? { model: "Z-Image Turbo Q4_K (local, stable-diffusion.cpp)", license: "Apache 2.0" }
  : useComfy
    ? { model: "FLUX.2 klein 4B GGUF", license: "Apache 2.0" }
    : { model: "Pollinations (flux)", license: "VERIFY terms at pollinations.ai before monetising" };
const EXT = useLocal || useComfy ? "png" : "jpg";

const videoFile = path.join(root, "data", "video.json");
const wfFile = path.join(root, "workflows", "image_api.json");
const imgDir = path.join(root, "public", "images");
const logFile = path.join(root, "data", "assets.json");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const seedOf = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7);

async function pollinations(prompt, outPath, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(stripLabels(prompt) + ", thick black outline cartoon, flat colors")}?width=1344&height=768&model=flux&seed=${seed}&nologo=true`;
  for (let a = 1; a <= 5; a++) {
    try {
      const r = await fetch(url);
      const type = r.headers.get("content-type") || "";
      if (r.ok && type.startsWith("image")) {
        fs.writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
        return;
      }
      console.log(`  attempt ${a} failed (${r.status}), waiting...`);
    } catch (e) {
      console.log(`  attempt ${a} error: ${e.message}`);
    }
    await sleep(20000);
  }
  throw new Error("Pollinations failed after 5 attempts");
}

async function localSd(prompt, outPath, seed) {
  const a = [
    "--diffusion-model", MODELS.diffusion,
    "--vae", MODELS.vae,
    "--llm", MODELS.llm,
    "--cfg-scale", "1.0",
    "--steps", STEPS,
    "-W", W,
    "-H", H,
    "--diffusion-fa",
    "--offload-to-cpu",
    "--vae-tiling",
    "-s", String(seed),
    "-p", buildPrompt(prompt),
    "-o", outPath,
  ];
  const r = spawnSync(SD_EXE, a, { stdio: ["ignore", "inherit", "inherit"], cwd: path.dirname(SD_EXE) });
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    throw new Error("sd-cli failed (exit " + r.status + "). If out of memory, run with SD_W=1024 SD_H=576");
  }
}

async function comfy(prompt, outPath, seed) {
  const text = JSON.stringify(STYLE + stripLabels(prompt)).slice(1, -1);
  const wf = JSON.parse(fs.readFileSync(wfFile, "utf8").replace(/__PROMPT__/g, text));
  for (const node of Object.values(wf)) {
    const i = node.inputs || {};
    if (typeof i.seed === "number") i.seed = seed;
    if (typeof i.noise_seed === "number") i.noise_seed = seed;
  }
  const r = await fetch(`${COMFY}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: wf }),
  });
  if (!r.ok) throw new Error("ComfyUI rejected the workflow: " + (await r.text()));
  const { prompt_id } = await r.json();
  for (let t = 0; t < 600; t++) {
    await sleep(1000);
    const job = (await (await fetch(`${COMFY}/history/${prompt_id}`)).json())[prompt_id];
    if (!job) continue;
    for (const o of Object.values(job.outputs || {})) {
      const im = o.images && o.images[0];
      if (im) {
        const q = new URLSearchParams({ filename: im.filename, subfolder: im.subfolder, type: im.type });
        fs.writeFileSync(outPath, Buffer.from(await (await fetch(`${COMFY}/view?${q}`)).arrayBuffer()));
        return;
      }
    }
    if (job.status && job.status.status_str === "error") throw new Error("Generation failed in ComfyUI");
  }
  throw new Error("Timed out waiting for ComfyUI");
}

(async () => {
  if (useLocal) console.log("Style: " + (STYLES[MODE] ? MODE : "story"));
  if (useLocal) {
    if (!SD_EXE) { console.error("Missing sd\\sd-cli.exe (see setup steps)"); process.exit(1); }
    for (const [k, f] of Object.entries(MODELS)) {
      if (!fs.existsSync(f)) { console.error(`Missing model file (${k}): ${f}`); process.exit(1); }
    }
  } else if (useComfy) {
    if (!fs.existsSync(wfFile)) { console.error("Missing workflows/image_api.json"); process.exit(1); }
    try { await fetch(COMFY); } catch { console.error("ComfyUI is not running at " + COMFY); process.exit(1); }
  }
  fs.mkdirSync(imgDir, { recursive: true });

  const video = JSON.parse(fs.readFileSync(videoFile, "utf8"));
  let log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, "utf8")) : [];

  const jobs = [];
  for (const s of video.scenes) {
    if (s.imagePrompt) jobs.push({ obj: s, key: s.id, prompt: s.imagePrompt });
    (s.beats || []).forEach((b, i) => {
      if (b.imagePrompt) jobs.push({ obj: b, key: `${s.id}_b${i + 1}`, prompt: b.imagePrompt });
    });
  }

  const generate = useLocal ? localSd : useComfy ? comfy : pollinations;
  let done = 0;
  for (const j of jobs) {
    if (only && j.key !== only && !j.key.startsWith(only + "_b")) continue;
    const file = `${j.key}.${EXT}`;
    const p = path.join(imgDir, file);
    j.obj.imageFile = `images/${file}`;
    if (fs.existsSync(p) && !force) continue;
    console.log(`Generating ${file} (${done + 1}) ...`);
    await generate(j.prompt, p, seedOf(j.key));
    log = log.filter(e => e.file !== file);
    log.push({ file, prompt: j.prompt, ...MODEL, date: new Date().toISOString() });
    fs.writeFileSync(videoFile, JSON.stringify(video, null, 2));
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
    done++;
    if (!useComfy && !useLocal) await sleep(16000); // free tier: 1 request per 15 s
  }
  fs.writeFileSync(videoFile, JSON.stringify(video, null, 2));
  console.log(`Done. ${done} new image(s). Total scenes: ${video.scenes.length}`);
})();
