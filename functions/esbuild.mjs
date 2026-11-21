import { build } from "esbuild"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  outfile: "lib/index.js",
  external: ["firebase-admin", "firebase-functions", "exceljs", "googleapis"],
  plugins: [
    {
      name: "piu-src",
      setup(result) {
        result.onResolve({ filter: /^@\// }, (args) => ({
          path: resolve(here, "../src", `${args.path.slice(2)}.ts`),
        }))
      },
    },
  ],
  logLevel: "info",
})
