const { spawn } = require("child_process");

const npmCommand = process.env.npm_execpath ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
const npmPrefix = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const processes = [
  spawn(npmCommand, [...npmPrefix, "--prefix", "backend", "run", "dev"], { stdio: "inherit" }),
  spawn(npmCommand, [...npmPrefix, "--prefix", "frontend", "run", "dev"], { stdio: "inherit" }),
];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  processes.forEach((child) => {
    if (!child.killed) child.kill();
  });
  process.exit(exitCode);
}

processes.forEach((child) => {
  child.on("exit", (code) => {
    if (!stopping && code) stop(code);
  });
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
});

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
