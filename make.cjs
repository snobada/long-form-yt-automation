const { spawnSync } = require("child_process");

for (const step of ["merge", "images", "narrate", "render"]) {
  console.log(`\n=== npm run ${step} ===`);
  const r = spawnSync("npm", ["run", step], { stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\nStopped: "${step}" failed. Fix it, then run npm run make again.`);
    process.exit(1);
  }
}
console.log("\nDone. Your video is at out\\video.mp4");