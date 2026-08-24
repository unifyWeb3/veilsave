import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const workspaceRoot = process.cwd();
const roots = ["apps", "packages", "scripts"];
const textExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".sol"]);
const forbiddenPatterns = [
  {
    label: "production import from disposable spikes",
    pattern: /(?:from\s+|import\s*)["'][^"']*spikes\//,
  },
  {
    label: "embedded private key",
    pattern: /(?:private[_-]?key|mnemonic)\s*[:=]\s*["'][^"']+["']/i,
  },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (
      ["node_modules", "artifacts", "cache", "coverage", "dist", "typechain-types"].includes(
        entry.name,
      )
    ) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (textExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

const violations = [];

for (const root of roots) {
  const absoluteRoot = path.join(workspaceRoot, root);
  let files = [];

  try {
    files = await walk(absoluteRoot);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      continue;
    }
    throw error;
  }

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const check of forbiddenPatterns) {
      if (check.pattern.test(source)) {
        violations.push(`${path.relative(workspaceRoot, file)}: ${check.label}`);
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`${violations.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Production source boundaries and secret checks passed.\n");
}
