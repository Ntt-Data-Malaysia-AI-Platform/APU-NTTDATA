// Builds the GitHub Pages version of the app into site/.
//
//   npm run build:static
//
// The page, styles and front-end modules are copied from public/; js/api.js is
// replaced by a browser bundle of the demo logic (web/static-api.ts), so the
// site needs no server. APP_USERNAME / APP_PASSWORD override the sign-in.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "site");

// Same defaults as server/config.ts. Empty values (e.g. unset CI secrets) fall back.
const username = process.env.APP_USERNAME || "Nttdata";
const password = process.env.APP_PASSWORD || "Nttdata@123";
const loginHash = createHash("sha256").update(`${username}\n${password}`).digest("hex");

const knowledgeDir = path.join(root, "knowledge");
const knowledge = fs
  .readdirSync(knowledgeDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => ({ name, content: fs.readFileSync(path.join(knowledgeDir, name), "utf8") }));

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, "public"), out, { recursive: true });
fs.writeFileSync(path.join(out, ".nojekyll"), ""); // serve files as-is, no Jekyll processing

await build({
  entryPoints: [path.join(root, "web", "static-api.ts")],
  outfile: path.join(out, "js", "api.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  define: {
    __KNOWLEDGE__: JSON.stringify(knowledge),
    __LOGIN_USER__: JSON.stringify(username),
    __LOGIN_HASH__: JSON.stringify(loginHash),
  },
});

const size = fs.statSync(path.join(out, "js", "api.js")).size;
console.log(`Static site built in site/ (api.js ${(size / 1024).toFixed(0)} KB, ${knowledge.length} knowledge files)`);
