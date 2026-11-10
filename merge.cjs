const fs = require("fs");
const path = require("path");

const NARRATION_FIELD = "narration"; // change if your scenes use another field name
const WPM = 150; // approx. Piper speaking speed

const root = path.resolve(__dirname, "..");
const chDir = path.join(root, "data", "chapters");
const out = path.join(root, "data", "video.json");
const metaFile = path.join(root, "data", "meta.json");

if (!fs.existsSync(chDir)) { console.error("Missing folder: data/chapters"); process.exit(1); }
const files = fs.readdirSync(chDir)
  .filter(f => /^ch\d+\.json$/.test(f))
  .sort((a, b) => parseInt(a.slice(2)) - parseInt(b.slice(2)));
if (!files.length) { console.error("No chN.json files in data/chapters"); process.exit(1); }

let base = {};
if (fs.existsSync(out)) {
  const old = JSON.parse(fs.readFileSync(out, "utf8"));
  const bdir = path.join(root, "data", "backup");
  fs.mkdirSync(bdir, { recursive: true });
  fs.copyFileSync(out, path.join(bdir, `video-${Date.now()}.json`));
  const { scenes, ...rest } = old;
  base = rest;
}
if (fs.existsSync(metaFile)) base = { ...base, ...JSON.parse(fs.readFileSync(metaFile, "utf8")) };

const scenes = [], problems = [];
let words = 0;
for (const f of files) {
  const n = parseInt(f.slice(2));
  const ch = JSON.parse(fs.readFileSync(path.join(chDir, f), "utf8"));
  (ch.scenes || []).forEach((s, i) => {
    const id = s.id || `ch${n}_s${i + 1}`;
    const text = s[NARRATION_FIELD] || "";
    if (!text) problems.push(`${id}: missing ${NARRATION_FIELD}`);
    if (!s.imagePrompt) problems.push(`${id}: missing imagePrompt`);
    words += text.split(/\s+/).filter(Boolean).length;
    scenes.push({ ...s, id, chapter: n });
  });
}

if (problems.length) { console.error("Fix these first:\n" + problems.join("\n")); process.exit(1); }

fs.writeFileSync(out, JSON.stringify({ ...base, scenes }, null, 2));
const min = (words / WPM).toFixed(1);
console.log(`Merged ${files.length} chapters, ${scenes.length} scenes, ${words} words, ~${min} min narration`);
if (min < 10) console.warn("Warning: under 10 minutes. Add more chapters or longer narration.");