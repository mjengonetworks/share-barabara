import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const extensions = ["", ".ts", ".tsx", ".js", ".mjs"];

function resolveFile(candidate) {
  for (const extension of extensions) {
    const path = `${candidate}${extension}`;
    if (existsSync(path)) return pathToFileURL(path).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const [rawSpecifier, query = ""] = specifier.split("?");
  if (rawSpecifier.endsWith(".md") && query === "raw") {
    const parent = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : root;
    const path = resolvePath(parent, rawSpecifier);
    return { url: `${pathToFileURL(path).href}?raw`, shortCircuit: true };
  }

  if (rawSpecifier.startsWith("@/")) {
    const resolved = resolveFile(join(root, "src", rawSpecifier.slice(2)));
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  if ((rawSpecifier.startsWith("./") || rawSpecifier.startsWith("../")) && context.parentURL) {
    const parent = dirname(fileURLToPath(context.parentURL));
    const resolved = resolveFile(resolvePath(parent, rawSpecifier));
    if (resolved) return { url: resolved, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".md?raw")) {
    const path = fileURLToPath(url.slice(0, -4));
    const source = await readFile(path, "utf8");
    return { format: "module", source: `export default ${JSON.stringify(source)};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
