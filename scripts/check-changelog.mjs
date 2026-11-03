#!/usr/bin/env node
// Pre-commit: reglas de .agents/rules/changelog.md
//  1. Si hay cambios staged, CHANGELOG.md debe estar entre ellos.
//  2. La versión de package.json debe ser igual a la última versión publicada del CHANGELOG.
//  3. Si cambia la versión en uno de los dos archivos, ambos deben ir en el mismo commit.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const fail = (lines) => {
  console.error(["", ...lines, "", "  Reglas: .agents/rules/changelog.md", ""].join("\n"));
  process.exit(1);
};

// Lee el contenido que se va a commitear (index); si no está staged, el del disco.
const staged = sh("git diff --cached --name-only --diff-filter=ACMRD").split("\n").map((f) => f.trim()).filter(Boolean);
const read = (file) => {
  try {
    return staged.includes(file) ? sh(`git show :${file}`) : readFileSync(file, "utf8");
  } catch {
    return readFileSync(file, "utf8");
  }
};
const readHead = (file) => {
  try {
    return sh(`git show HEAD:${file}`);
  } catch {
    return null;
  }
};

const changelogVersion = (text) => text?.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1] ?? null;
const packageVersion = (text) => {
  try {
    return JSON.parse(text).version ?? null;
  } catch {
    return null;
  }
};

// ── Regla 2: versiones alineadas (siempre, incluso con SKIP_CHANGELOG) ──
const clVersion = changelogVersion(read("CHANGELOG.md"));
const pkgVersion = packageVersion(read("package.json"));

if (!clVersion) {
  fail(["✖ CHANGELOG.md no tiene ninguna versión publicada (## [x.y.z] - AAAA-MM-DD)."]);
}
if (clVersion !== pkgVersion) {
  fail([
    "✖ Las versiones no coinciden.",
    "",
    `  package.json  → ${pkgVersion}`,
    `  CHANGELOG.md  → ${clVersion} (última versión publicada)`,
    "",
    "  Actualiza ambas en el mismo commit.",
  ]);
}

// ── Regla 3: si cambió la versión, los dos archivos van juntos ──
const headCl = changelogVersion(readHead("CHANGELOG.md"));
const headPkg = packageVersion(readHead("package.json"));
const versionChanged = (headCl && headCl !== clVersion) || (headPkg && headPkg !== pkgVersion);
if (versionChanged && !(staged.includes("CHANGELOG.md") && staged.includes("package.json"))) {
  fail([
    `✖ La versión cambió (${headPkg ?? headCl} → ${pkgVersion}).`,
    "  Agrega CHANGELOG.md y package.json al mismo commit.",
  ]);
}

if (process.env.SKIP_CHANGELOG === "1") process.exit(0);

// ── Regla 1: todo cambio actualiza el CHANGELOG ──
const ignored = (f) =>
  f === "CHANGELOG.md" || f.endsWith(".DS_Store") || (f === "pnpm-lock.yaml" && !staged.includes("package.json"));
const relevant = staged.filter((f) => !ignored(f));

if (relevant.length > 0 && !staged.includes("CHANGELOG.md")) {
  fail([
    "✖ Falta actualizar CHANGELOG.md.",
    "",
    "  Agrega una entrada bajo '## [Sin publicar]' describiendo el cambio",
    "  y súmala al commit (git add CHANGELOG.md).",
    "",
    `  Archivos en este commit: ${relevant.slice(0, 8).join(", ")}${relevant.length > 8 ? "…" : ""}`,
  ]);
}
