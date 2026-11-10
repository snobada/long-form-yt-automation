import {spawnSync} from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const jsonPath = path.join(root, "data", "video.json");
const exe = path.join(root, "tools", "piper", "piper.exe");
const voiceDir = path.join(root, "tools", "voices");
const outDir = path.join(root, "public", "audio", "narration");
const cacheDir = path.join(root, ".cache");
const cachePath = path.join(cacheDir, "narration-cache.json");
const backupPath = path.join(cacheDir, "video.json.bak");

const die = (msg) => {
  console.error(`\nFAILED: ${msg}`);
  process.exit(1);
};

// ---- options: --force, --only <sceneId>, --voice <name>, --speed <0.5-2>
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const force = args.includes("--force");
const only = option("--only");

// ---- load JSON
const loadJson = () => {
  const raw = fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    die(`data/video.json is not valid JSON: ${e.message}`);
  }
  return {data, indent: raw.match(/\n([ \t]+)"/)?.[1] ?? 2};
};

if (!fs.existsSync(jsonPath)) die("data/video.json not found.");
const {data} = loadJson();
if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
  die('data/video.json has no "scenes" array.');
}

const voice = option("--voice") ?? data.tts?.voice ?? "en_US-lessac-medium";
const speed = Number(option("--speed") ?? data.tts?.speed ?? 1);
if (!(speed >= 0.5 && speed <= 2)) die("Speed must be between 0.5 and 2.");

const model = path.join(voiceDir, `${voice}.onnx`);
if (!fs.existsSync(exe)) die("tools\\piper\\piper.exe not found. Run setup-piper.bat first.");
if (!fs.existsSync(model)) die(`Voice not found: tools\\voices\\${voice}.onnx`);

// ---- scene ids must exist and map to unique file names
const safeName = (id) => String(id).replace(/[^a-zA-Z0-9_-]/g, "_");
const seen = new Set();
for (const scene of data.scenes) {
  if (scene.id === undefined || scene.id === "") die("A scene has no id.");
  const name = safeName(scene.id);
  if (seen.has(name)) die(`Duplicate scene id: ${scene.id}`);
  seen.add(name);
}
if (only && !data.scenes.some((s) => String(s.id) === only)) {
  die(`No scene with id "${only}".`);
}

// ---- helpers
const wavSeconds = (file) => {
  const buf = fs.readFileSync(file);
  if (
    buf.length < 44 ||
    buf.toString("ascii", 0, 4) !== "RIFF" ||
    buf.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error("not a valid WAV file");
  }
  let pos = 12;
  let fmt = null;
  let dataBytes = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    let size = buf.readUInt32LE(pos + 4);
    const start = pos + 8;
    if (id === "fmt ") {
      fmt = {
        channels: buf.readUInt16LE(start + 2),
        sampleRate: buf.readUInt32LE(start + 4),
        bits: buf.readUInt16LE(start + 14),
      };
    } else if (id === "data") {
      if (start + size > buf.length) size = buf.length - start;
      dataBytes = size;
    }
    pos = start + size + (size % 2);
  }
  if (!fmt || !dataBytes) throw new Error("WAV has no audio data");
  const seconds = dataBytes / (fmt.sampleRate * fmt.channels * (fmt.bits / 8));
  if (seconds < 0.3) throw new Error(`audio is too short (${seconds.toFixed(2)}s)`);
  return seconds;
};

const synthesize = (text, outFile) => {
  const result = spawnSync(
    exe,
    ["--model", model, "--output_file", outFile, "--length_scale", String(1 / speed)],
    {
      input: text.replace(/\s+/g, " ").trim() + "\n",
      encoding: "utf8",
      cwd: path.dirname(exe),
      windowsHide: true,
      timeout: 120000,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const tail = (result.stderr || "").trim().split("\n").slice(-3).join(" ");
    throw new Error(`Piper exited with code ${result.status}: ${tail}`);
  }
  if (!fs.existsSync(outFile)) throw new Error("Piper produced no file");
};

const hashOf = (text) =>
  crypto.createHash("sha1").update(JSON.stringify([voice, speed, text])).digest("hex").slice(0, 16);

const r3 = (n) => Math.round(n * 1000) / 1000;

// ---- generate
fs.mkdirSync(outDir, {recursive: true});
fs.mkdirSync(cacheDir, {recursive: true});

let cache = {};
try {
  cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
} catch {
  cache = {};
}

console.log(`Voice: ${voice}   Speed: ${speed}${force ? "   (forced)" : ""}\n`);

const rows = [];
const failures = [];
const updates = new Map();

for (const scene of data.scenes) {
  const id = String(scene.id);
  if (only && id !== only) continue;

  const text = typeof scene.narration === "string" ? scene.narration.trim() : "";
  if (!text) {
    rows.push({id, status: "skipped (no narration)", seconds: null});
    continue;
  }

  const base = safeName(id);
  const fileName = `${base}.wav`;
  const finalPath = path.join(outDir, fileName);
  const tmpPath = path.join(outDir, `${base}.tmp.wav`);
  const hash = hashOf(text);

  try {
    let status = "cached";
    if (force || cache[id] !== hash || !fs.existsSync(finalPath)) {
      process.stdout.write(`Generating ${id}... `);
      try {
        synthesize(text, tmpPath);
        wavSeconds(tmpPath); // validate before replacing the real file
        fs.renameSync(tmpPath, finalPath);
      } finally {
        fs.rmSync(tmpPath, {force: true});
      }
      cache[id] = hash;
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
      status = "generated";
      console.log("done");
    }

    const seconds = r3(wavSeconds(finalPath));
    updates.set(id, {narrationFile: fileName, audioDurationSec: seconds});
    rows.push({id, status, seconds});
  } catch (e) {
    failures.push({id, message: e.message});
    rows.push({id, status: "FAILED", seconds: null});
  }
}

// ---- save JSON (re-read first, verify, keep a backup)
const fresh = loadJson();
let changed = 0;
for (const scene of fresh.data.scenes) {
  const u = updates.get(String(scene.id));
  if (!u) continue;
  if (scene.narrationFile !== u.narrationFile || scene.audioDurationSec !== u.audioDurationSec) {
    scene.narrationFile = u.narrationFile;
    scene.audioDurationSec = u.audioDurationSec;
    changed++;
  }
}

if (changed > 0) {
  const tmp = `${jsonPath}.tmp`;
  try {
    fs.copyFileSync(jsonPath, backupPath);
    fs.writeFileSync(tmp, JSON.stringify(fresh.data, null, fresh.indent) + "\n");
    JSON.parse(fs.readFileSync(tmp, "utf8")); // must be valid before it replaces the original
    fs.renameSync(tmp, jsonPath);
  } catch (e) {
    fs.rmSync(tmp, {force: true});
    die(`Could not update data/video.json (original is unchanged): ${e.message}`);
  }
}

// ---- report
console.log("\nScene".padEnd(12) + "Status".padEnd(26) + "Duration");
for (const r of rows) {
  console.log(
    r.id.padEnd(11) + r.status.padEnd(26) + (r.seconds === null ? "-" : `${r.seconds.toFixed(2)}s`),
  );
}

const estimate = (scenes) => {
  let total = 0;
  for (const s of scenes) {
    const words = String(s.narration ?? "").trim().split(/\s+/).filter(Boolean).length;
    const speech = s.audioDurationSec ?? words / 2.5;
    total += Math.max(speech + 1.2, s.durationSec ?? 0, 3);
  }
  return total - (scenes.length - 1) * 0.5;
};

const narrationTotal = [...updates.values()].reduce((sum, u) => sum + u.audioDurationSec, 0);
console.log(`\nNarration total: ${narrationTotal.toFixed(1)}s across ${updates.size} scenes`);
console.log(`Estimated video length: about ${Math.round(estimate(fresh.data.scenes))}s`);
console.log(changed > 0 ? `video.json updated (${changed} scenes). Backup: .cache\\video.json.bak` : "video.json already up to date.");

if (failures.length > 0) {
  console.error("\nFailed scenes (their old values were left unchanged):");
  for (const f of failures) console.error(`  ${f.id}: ${f.message}`);
  process.exitCode = 1;
}