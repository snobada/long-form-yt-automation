import {spawnSync} from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exe = path.join(root, "tools", "piper", "piper.exe");
const voice = process.argv[2] ?? "en_US-lessac-medium";
const model = path.join(root, "tools", "voices", `${voice}.onnx`);
const outFile = path.join(root, ".cache", "tts-test.wav");

const text =
  "Every breath you take depends on a quiet miracle happening in leaves all around you. This is photosynthesis.";

const fail = (msg) => {
  console.error(`FAILED: ${msg}`);
  process.exit(1);
};

if (!fs.existsSync(exe)) fail("tools\\piper\\piper.exe not found. Run setup-piper.bat first.");
if (!fs.existsSync(model)) fail(`tools\\voices\\${voice}.onnx not found. Run setup-piper.bat first.`);

fs.mkdirSync(path.dirname(outFile), {recursive: true});
if (fs.existsSync(outFile)) fs.rmSync(outFile);

console.log(`Synthesizing with voice ${voice}...`);
const started = Date.now();
const result = spawnSync(
  exe,
  ["--model", model, "--output_file", outFile, "--length_scale", "1"],
  {input: text + "\n", encoding: "utf8", cwd: path.dirname(exe), windowsHide: true},
);

if (result.error) fail(result.error.message);
if (result.status !== 0) {
  const hint =
    result.status === 3221225781 || result.status === -1073741515
      ? " (a DLL is missing: install the free Microsoft Visual C++ Redistributable x64)"
      : "";
  fail(`Piper exited with code ${result.status}${hint}\n${result.stderr}`);
}
if (!fs.existsSync(outFile)) fail(`Piper produced no file.\n${result.stderr}`);

// Read the WAV header and measure the real duration.
const buf = fs.readFileSync(outFile);
if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
  fail("Output is not a valid WAV file.");
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

if (!fmt || !dataBytes) fail("WAV has no audio data.");

const seconds = dataBytes / (fmt.sampleRate * fmt.channels * (fmt.bits / 8));
if (seconds < 3 || seconds > 20) {
  fail(`Unexpected duration ${seconds.toFixed(2)}s for this sentence.`);
}

console.log("OK");
console.log(`  file:     ${outFile}`);
console.log(`  format:   ${fmt.sampleRate} Hz, ${fmt.channels} ch, ${fmt.bits}-bit`);
console.log(`  duration: ${seconds.toFixed(2)}s`);
console.log(`  time:     ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log("\nListen to it with:  start .cache\\tts-test.wav");