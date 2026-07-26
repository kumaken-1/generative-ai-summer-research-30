import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const inputPath = path.resolve(
  process.cwd(),
  process.argv[2] ?? "../７つの力.png",
);
const outputDirectory = path.join(projectDirectory, "assets");

const variants = [
  { width: 720, output: "seven-powers-720.webp" },
  { width: 1055, output: "seven-powers-1055.webp" },
];

await mkdir(outputDirectory, { recursive: true });

for (const variant of variants) {
  const outputPath = path.join(outputDirectory, variant.output);
  await sharp(inputPath)
    .resize({ width: variant.width, withoutEnlargement: true })
    .webp({ quality: 86, smartSubsample: true })
    .toFile(outputPath);
  console.log(`Generated ${path.relative(projectDirectory, outputPath)}`);
}
