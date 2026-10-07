import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(root, "..", "assets");
const OUT = path.join(root, "..", "public", "images");

/**
 * The static export ships no image optimisation server, so every rendition the
 * page needs is produced here at build time and referenced through srcset.
 *
 * Crops are expressed in source pixels. Both portraits are squared off to a
 * common 3:4 so the leadership cards sit level.
 */
const jobs = [
  {
    src: "building.jpg",
    name: "building",
    // Trimmed to 16:9 so the whole building fits a banner without the hero
    // having to crop it: roof sign at the top, boundary wall at the bottom.
    crop: { left: 0, top: 60, width: 2400, height: 1350 },
    widths: [800, 1280, 1920, 2400],
    quality: 76,
  },
  {
    src: "principal.jpg",
    name: "principal",
    // Head and shoulders with room above, framed to sit at the same distance
    // as the portrait beside it: the two are read as a pair, and one drawn
    // closer than the other reads as a difference in standing.
    crop: { left: 150, top: 560, width: 1800, height: 2400 },
    widths: [360, 720],
    quality: 80,
  },
  {
    src: "director.jpg",
    name: "director",
    crop: { left: 0, top: 30, width: 696, height: 928 },
    widths: [360, 720],
    quality: 80,
  },
  {
    // Kept at its native 3:2 so the room reads as a room: the shelves and the
    // wall painting are what the paragraph beside it describes.
    src: "classroom.jpg",
    name: "classroom",
    widths: [600, 900, 1200],
    quality: 74,
  },
];

/**
 * The gallery is cropped rather than trimmed by hand: these are album
 * photographs of varying shape, and a single ratio is what lets them sit in an
 * even grid. `attention` picks the busiest region, which in a photograph of a
 * group is the group.
 */
const GALLERY_WIDTHS = [400, 600, 800, 1200];
const GALLERY_RATIO = 3 / 4;

const gallery = [
  "holi",
  "childrens-day",
  "green-day",
  "janmashtami",
  "pool-party",
  "christmas",
  "mango-day",
  "rhyme-recitation",
  "shape-day",
  "earth-day",
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

for (const job of jobs) {
  const source = sharp(path.join(SRC, job.src));
  const { width: sourceWidth } = await source.metadata();
  const available = job.crop ? job.crop.width : sourceWidth;

  for (const requested of job.widths) {
    // Name the file after the width it will actually have. Renditions are
    // never upscaled, so a narrow source would otherwise produce a file whose
    // name disagrees with its srcset descriptor.
    const width = Math.min(requested, available);

    const pipeline = sharp(path.join(SRC, job.src)).rotate();
    if (job.crop) pipeline.extract(job.crop);

    const info = await pipeline
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: job.quality })
      .toFile(path.join(OUT, `${job.name}-${width}.webp`));

    console.log(
      `${job.name}-${width}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`,
    );
  }
}

for (const name of gallery) {
  const source = path.join(SRC, "gallery", `${name}.jpg`);
  const { width: sourceWidth } = await sharp(source).metadata();

  for (const requested of GALLERY_WIDTHS) {
    const width = Math.min(requested, sourceWidth);

    const info = await sharp(source)
      .rotate()
      .resize({
        width,
        height: Math.round(width * GALLERY_RATIO),
        fit: "cover",
        position: sharp.strategy.attention,
        withoutEnlargement: true,
      })
      .webp({ quality: 72 })
      .toFile(path.join(OUT, `${name}-${width}.webp`));

    console.log(
      `${name}-${width}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`,
    );
  }
}

/**
 * The picture that stands in for the whole site when a link to it is pasted
 * into a message. Written as JPEG at the proportions the preview is cropped
 * to, because the places these links are shared reach further than the formats
 * the site itself can afford to use.
 */
const share = sharp(path.join(SRC, "building.jpg"))
  .rotate()
  .extract({ left: 0, top: 60, width: 2400, height: 1350 })
  .resize({ width: 1200, height: 630, fit: "cover" })
  .jpeg({ quality: 78, mozjpeg: true });

const shareInfo = await share.toFile(path.join(OUT, "share.jpg"));
console.log(
  `share.jpg  ${shareInfo.width}x${shareInfo.height}  ${Math.round(shareInfo.size / 1024)} KB`,
);

/**
 * A raster of the crest for the structured data, which search engines read for
 * the knowledge panel. The vector the site itself uses is not interchangeable
 * here: the documented formats for that property are raster ones.
 */
const logoInfo = await sharp(path.join(root, "..", "src", "app", "icon.svg"), {
  density: 400,
})
  .resize({ width: 512 })
  .png()
  .toFile(path.join(OUT, "logo.png"));
console.log(
  `logo.png   ${logoInfo.width}x${logoInfo.height}  ${Math.round(logoInfo.size / 1024)} KB`,
);

const written = await readdir(OUT);
console.log(`\n${written.length} renditions written to public/images`);
