#!/usr/bin/env node
// Bloquea el commit si hay cambios staged y CHANGELOG.md no está entre ellos.
// Regla: .agents/rules/changelog.md
import { execSync } from "node:child_process";

if (process.env.SKIP_CHANGELOG === "1") process.exit(0);

const staged = execSync("git diff --cached --name-only --diff-filter=ACMRD", { encoding: "utf8" })
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean);

const ignored = (f) =>
  f === "CHANGELOG.md" ||
  f.endsWith(".DS_Store") ||
  (f === "pnpm-lock.yaml" && !staged.includes("package.json"));

const relevant = staged.filter((f) => !ignored(f));

if (relevant.length > 0 && !staged.includes("CHANGELOG.md")) {
  console.error(
    [
      "",
      "✖ Falta actualizar CHANGELOG.md.",
      "",
      "  Agrega una entrada bajo '## [Sin publicar]' describiendo el cambio",
      "  y súmala al commit (git add CHANGELOG.md).",
      "  Reglas: .agents/rules/changelog.md",
      "",
      `  Archivos en este commit: ${relevant.slice(0, 8).join(", ")}${relevant.length > 8 ? "…" : ""}`,
      "",
    ].join("\n")
  );
  process.exit(1);
}
