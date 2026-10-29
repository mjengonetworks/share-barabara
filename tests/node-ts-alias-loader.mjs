import { access, readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

async function existingModule(basePath) {
  const candidates = [basePath, `${basePath}.ts`, `${basePath}.tsx`, `${basePath}.js`, `${basePath}.mjs`];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue through the same source extensions supported by the app.
    }
  }
  return undefined;
}

export async function resolve(specifier, context, nextResolve) {
  let basePath;
  if (specifier.startsWith("@/")) {
    basePath = path.join(sourceRoot, specifier.slice(2).split("?")[0]);
  } else if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    context.parentURL?.startsWith(pathToFileURL(sourceRoot).href)
  ) {
    basePath = fileURLToPath(new URL(specifier.split("?")[0], context.parentURL));
  }

  if (basePath) {
    const resolved = await existingModule(basePath);
    if (resolved) {
      const raw = specifier.endsWith("?raw") ? "?raw" : "";
      return { url: `${pathToFileURL(resolved).href}${raw}`, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".md?raw")) {
    const markdown = await readFile(fileURLToPath(url.slice(0, -4)), "utf8");
    return { format: "module", source: `export default ${JSON.stringify(markdown)};`, shortCircuit: true };
  }
  return nextLoad(url, context);
}
