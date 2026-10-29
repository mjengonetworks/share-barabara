import { register } from "node:module";

register(new URL("./node-ts-alias-loader.mjs", import.meta.url).href, import.meta.url);
