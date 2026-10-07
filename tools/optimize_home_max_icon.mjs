import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

// Keep the source intact; the header only needs a 2x version of its 26px icon.
const source = new URL("../apps/web/public/brand/max.webp", import.meta.url);
const target = new URL("../apps/web/public/brand/max-52.webp", import.meta.url);
const input = await readFile(source);
const output = await sharp(input).resize(52, 52).webp({ quality: 80, effort: 6 }).toBuffer();
await writeFile(target, output);
console.log(`MAX header icon: ${input.length} -> ${output.length} bytes`);
