import type { NativeImage } from 'electron';
import { nativeImage } from 'electron';

// Paints a dot with a border in the top-right corner of the icon.
// toBitmap() returns raw BGRA bytes; colors map as [B, G, R, A].
export function makeBadgeIcon(base: NativeImage): NativeImage {
  const { width, height } = base.getSize();
  const pixelData = Buffer.from(base.toBitmap());

  const dotRadius = Math.max(3, Math.floor(width * 0.2));
  const borderThickness = Math.max(1, Math.floor(dotRadius * 0.35));
  const outerRadius = dotRadius + borderThickness;
  const centerX = width - dotRadius - borderThickness;
  const centerY = dotRadius + borderThickness;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const deltaX = col - centerX;
      const deltaY = row - centerY;
      const distanceSquared = deltaX * deltaX + deltaY * deltaY;
      const pixelIndex = (row * width + col) * 4;

      if (distanceSquared <= outerRadius * outerRadius) {
        // border ring
        pixelData[pixelIndex] = 0; // B
        pixelData[pixelIndex + 1] = 0; // G
        pixelData[pixelIndex + 2] = 0; // R
        pixelData[pixelIndex + 3] = 0; // A
      }

      if (distanceSquared <= dotRadius * dotRadius) {
        // badge dot
        pixelData[pixelIndex] = 38; // B
        pixelData[pixelIndex + 1] = 38; // G
        pixelData[pixelIndex + 2] = 220; // R
        pixelData[pixelIndex + 3] = 255; // A
      }
    }
  }

  return nativeImage.createFromBitmap(pixelData, { width, height });
}
