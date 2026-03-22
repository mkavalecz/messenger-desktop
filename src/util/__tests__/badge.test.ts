import { makeBadgeIcon } from '../badge';

// Mock electron's nativeImage since it's not available in Jest's node environment
jest.mock('electron', () => ({
  nativeImage: {
    createFromBitmap: (data: Buffer, size: { width: number; height: number }) => ({
      _data: Buffer.from(data),
      _size: size,
      getSize: () => size,
      toBitmap: () => Buffer.from(data)
    })
  }
}));

describe('makeBadgeIcon', () => {
  it('preserves original image dimensions', () => {
    const base = makeImage(32, 32) as any;
    const result = makeBadgeIcon(base) as any;
    expect(result._size).toEqual({ width: 32, height: 32 });
  });

  it('paints the badge dot red (BGRA: 38,38,220,255) at the center pixel', () => {
    const width = 32;
    const base = makeImage(width, 32) as any;
    const result = makeBadgeIcon(base) as any;

    // For 32x32: dotRadius = max(3, floor(32*0.20)) = 6
    // borderThickness = max(1, floor(6*0.35)) = 2
    // centerX = 32 - 6 - 2 = 24, centerY = 6 + 2 = 8
    const { centerX, centerY } = getBadgeGeometry(width);
    const pixelIndex = (centerY * width + centerX) * 4;
    const data: Buffer = result._data;
    expect(data[pixelIndex]).toBe(38); // B
    expect(data[pixelIndex + 1]).toBe(38); // G
    expect(data[pixelIndex + 2]).toBe(220); // R
    expect(data[pixelIndex + 3]).toBe(255); // A
  });

  it('clears the border ring pixels to transparent (BGRA: 0,0,0,0)', () => {
    const width = 32;
    // Fill with a non-zero value so we can verify the border was cleared
    const base = makeImage(width, 32, 255) as any;
    const result = makeBadgeIcon(base) as any;

    const { dotRadius, outerRadius, centerX, centerY } = getBadgeGeometry(width);

    // Pick a pixel in the border ring: at distance between dotRadius and outerRadius
    // Move exactly (outerRadius) pixels up from center — should be in border ring, not dot
    const ringRow = centerY - outerRadius;
    const ringCol = centerX;
    const distSq = (ringCol - centerX) ** 2 + (ringRow - centerY) ** 2;
    expect(distSq).toBeLessThanOrEqual(outerRadius * outerRadius);
    expect(distSq).toBeGreaterThan(dotRadius * dotRadius);

    const pixelIndex = (ringRow * width + ringCol) * 4;
    const resultData: Buffer = result._data;
    expect(resultData[pixelIndex]).toBe(0); // B
    expect(resultData[pixelIndex + 1]).toBe(0); // G
    expect(resultData[pixelIndex + 2]).toBe(0); // R
    expect(resultData[pixelIndex + 3]).toBe(0); // A
  });

  it('leaves pixels outside the badge unchanged', () => {
    const width = 32;
    const fill = 128;
    const base = makeImage(width, 32, fill) as any;
    const result = makeBadgeIcon(base) as any;

    // Bottom-left corner is far from the badge (top-right), should be unchanged
    const pixelIndex = (32 - 1) * width * 4;
    const resultData: Buffer = result._data;
    expect(resultData[pixelIndex]).toBe(fill);
    expect(resultData[pixelIndex + 1]).toBe(fill);
    expect(resultData[pixelIndex + 2]).toBe(fill);
    expect(resultData[pixelIndex + 3]).toBe(fill);
  });

  it('works correctly for small icons (16x16)', () => {
    const width = 16;
    const base = makeImage(width, 16) as any;
    const result = makeBadgeIcon(base) as any;

    expect(result._size).toEqual({ width: 16, height: 16 });

    const { centerX, centerY } = getBadgeGeometry(width);
    const pixelIndex = (centerY * width + centerX) * 4;
    const resultData: Buffer = result._data;
    expect(resultData[pixelIndex + 2]).toBe(220); // R channel confirms red dot
    expect(resultData[pixelIndex + 3]).toBe(255); // fully opaque
  });
});

function makeImage(width: number, height: number, fill = 0) {
  const data = Buffer.alloc(width * height * 4, fill);
  return {
    getSize: () => ({ width, height }),
    toBitmap: () => Buffer.from(data)
  };
}

function getBadgeGeometry(width: number) {
  const dotRadius = Math.max(3, Math.floor(width * 0.2));
  const borderThickness = Math.max(1, Math.floor(dotRadius * 0.35));
  const outerRadius = dotRadius + borderThickness;
  const centerX = width - dotRadius - borderThickness;
  const centerY = dotRadius + borderThickness;
  return { dotRadius, borderThickness, outerRadius, centerX, centerY };
}
