// F-014 R-005: reads one pixel's colour from a Playwright PNG screenshot, so a
// spec can check what actually painted at a point (a winning piece's backing
// disc above the win-line bar). Supports what browsers produce: 8-bit RGB or
// RGBA, not interlaced. Node's zlib only; no image dependency.
import { inflateSync } from "node:zlib";

export interface PixelColor {
  red: number;
  green: number;
  blue: number;
}

const PNG_SIGNATURE_BYTES = 8;
const COLOR_TYPE_RGB = 2;
const COLOR_TYPE_RGBA = 6;

function predictPaeth(left: number, above: number, aboveLeft: number): number {
  const estimate = left + above - aboveLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const aboveLeftDistance = Math.abs(estimate - aboveLeft);
  if (leftDistance <= aboveDistance && leftDistance <= aboveLeftDistance) {
    return left;
  }
  return aboveDistance <= aboveLeftDistance ? above : aboveLeft;
}

/** The colour of the pixel at (column, row) of a PNG image, in image pixels. */
export function readPngPixel(
  png: Buffer,
  column: number,
  row: number,
): PixelColor {
  let offset = PNG_SIGNATURE_BYTES;
  let width = 0;
  let height = 0;
  let bytesPerPixel = 0;
  const compressedChunks: Buffer[] = [];
  while (offset < png.length) {
    const chunkLength = png.readUInt32BE(offset);
    const chunkType = png.toString("ascii", offset + 4, offset + 8);
    const chunkBody = png.subarray(offset + 8, offset + 8 + chunkLength);
    if (chunkType === "IHDR") {
      width = chunkBody.readUInt32BE(0);
      height = chunkBody.readUInt32BE(4);
      const bitDepth = chunkBody[8];
      const colorType = chunkBody[9];
      const interlaceMethod = chunkBody[12];
      if (
        bitDepth !== 8 ||
        interlaceMethod !== 0 ||
        (colorType !== COLOR_TYPE_RGB && colorType !== COLOR_TYPE_RGBA)
      ) {
        throw new Error(
          `unsupported PNG: bit depth ${String(bitDepth)}, colour type ${String(colorType)}, interlace ${String(interlaceMethod)}`,
        );
      }
      bytesPerPixel = colorType === COLOR_TYPE_RGBA ? 4 : 3;
    } else if (chunkType === "IDAT") {
      compressedChunks.push(chunkBody);
    } else if (chunkType === "IEND") {
      break;
    }
    offset += chunkLength + 12;
  }
  if (column < 0 || row < 0 || column >= width || row >= height) {
    throw new Error(
      `pixel (${String(column)}, ${String(row)}) is outside the ${String(width)}×${String(height)} image`,
    );
  }

  const filtered = inflateSync(Buffer.concat(compressedChunks));
  const stride = width * bytesPerPixel;
  let previousRow = new Uint8Array(stride);
  let currentRow = new Uint8Array(stride);
  for (let rowIndex = 0; rowIndex <= row; rowIndex += 1) {
    const rowStart = rowIndex * (stride + 1);
    const filterType = filtered[rowStart];
    currentRow = new Uint8Array(stride);
    for (let byteIndex = 0; byteIndex < stride; byteIndex += 1) {
      const rawByte = filtered[rowStart + 1 + byteIndex] ?? 0;
      const left =
        byteIndex >= bytesPerPixel
          ? (currentRow[byteIndex - bytesPerPixel] ?? 0)
          : 0;
      const above = previousRow[byteIndex] ?? 0;
      const aboveLeft =
        byteIndex >= bytesPerPixel
          ? (previousRow[byteIndex - bytesPerPixel] ?? 0)
          : 0;
      let predictor = 0;
      if (filterType === 1) {
        predictor = left;
      } else if (filterType === 2) {
        predictor = above;
      } else if (filterType === 3) {
        predictor = Math.floor((left + above) / 2);
      } else if (filterType === 4) {
        predictor = predictPaeth(left, above, aboveLeft);
      }
      currentRow[byteIndex] = (rawByte + predictor) & 0xff;
    }
    previousRow = currentRow;
  }
  const pixelStart = column * bytesPerPixel;
  return {
    red: currentRow[pixelStart] ?? 0,
    green: currentRow[pixelStart + 1] ?? 0,
    blue: currentRow[pixelStart + 2] ?? 0,
  };
}
