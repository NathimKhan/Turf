const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

const files = [
  ...javascriptFiles(path.join(__dirname, "../src")),
  ...javascriptFiles(path.join(__dirname, "../test")).filter((file) => fs.existsSync(file)),
];

files.forEach((file) => {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
});

console.log(`Checked ${files.length} backend JavaScript files.`);
