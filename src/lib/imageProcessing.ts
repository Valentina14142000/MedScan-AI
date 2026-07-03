import type { ImageAdjustments } from '../types';

export function applyAdjustments(
  sourceCanvas: HTMLCanvasElement,
  destCanvas: HTMLCanvasElement,
  adjustments: ImageAdjustments
): void {
  const ctx = destCanvas.getContext('2d')!;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  destCanvas.width = w;
  destCanvas.height = h;

  // Draw source
  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const brightness = adjustments.brightness; // -100 to 100
  const contrast = adjustments.contrast; // -100 to 100
  const sharpen = adjustments.sharpen; // 0 to 100

  // Brightness & contrast
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessAdd = (brightness / 100) * 255;

  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      // Contrast
      val = contrastFactor * (val - 128) + 128;
      // Brightness
      val += brightnessAdd;
      data[i + c] = Math.max(0, Math.min(255, val));
    }
  }

  // Sharpening (unsharp mask via convolution)
  if (sharpen > 0) {
    const amount = sharpen / 100;
    const original = new Uint8ClampedArray(data);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let ki = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += original[idx] * kernel[ki++];
            }
          }
          const idx = (y * w + x) * 4 + c;
          const sharpened = sum;
          data[idx] = Math.max(0, Math.min(255, original[idx] * (1 - amount) + sharpened * amount));
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function loadImageToCanvas(
  imageSrc: string,
  canvas: HTMLCanvasElement,
  maxSize = 512
): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const ratio = maxSize / Math.max(width, height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve();
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

export function blendHeatmap(
  baseCanvas: HTMLCanvasElement,
  heatmapImage: HTMLImageElement,
  destCanvas: HTMLCanvasElement,
  opacity: number
): void {
  const ctx = destCanvas.getContext('2d')!;
  const w = baseCanvas.width;
  const h = baseCanvas.height;
  destCanvas.width = w;
  destCanvas.height = h;

  // Draw base image
  ctx.drawImage(baseCanvas, 0, 0);

  // Draw heatmap with opacity
  ctx.globalAlpha = opacity;
  ctx.drawImage(heatmapImage, 0, 0, w, h);
  ctx.globalAlpha = 1;
}
