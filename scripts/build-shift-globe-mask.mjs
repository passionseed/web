/**
 * Builds public/shift/globe/land-mask.png, the equirectangular land mask the
 * /shift/next globe shader samples (white = land, black = sea).
 *
 * Source: Natural Earth 1:50m land via the world-atlas package (public domain).
 * The tools are not app dependencies, so run it from a scratch install:
 *
 *   mkdir /tmp/globe && cd /tmp/globe && npm i topojson-client d3-geo sharp world-atlas
 *   NODE_PATH=/tmp/globe/node_modules node scripts/build-shift-globe-mask.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(path.join(process.env.NODE_PATH ?? ".", "noop.js"));
const { feature } = require("topojson-client");
const { geoEquirectangular, geoPath } = require("d3-geo");
const sharp = require("sharp");
const land = require("world-atlas/land-50m.json");

const WIDTH = 2048;
const HEIGHT = 1024;

const projection = geoEquirectangular()
  .scale(WIDTH / (2 * Math.PI))
  .translate([WIDTH / 2, HEIGHT / 2])
  .precision(0.1);
const d = geoPath(projection)(feature(land, land.objects.land));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
<rect width="100%" height="100%" fill="#000"/><path d="${d}" fill="#fff"/></svg>`;

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "../public/shift/globe/land-mask.png");
await sharp(Buffer.from(svg)).greyscale().png({ compressionLevel: 9, palette: true, colours: 2 }).toFile(out);
console.log(`wrote ${out}`);
