/** Resize to <=1600px and re-encode as JPEG in the browser. Returns the blob and base64 (no prefix). */
export async function prepareImage(file: File): Promise<{ blob: Blob; base64: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('That file could not be read as an image.'));
      i.src = url;
    });
    const s = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process the image.'))), 'image/jpeg', 0.88),
    );
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = () => reject(new Error('Could not read the image.'));
      r.readAsDataURL(blob);
    });
    return { blob, base64 };
  } finally {
    URL.revokeObjectURL(url);
  }
}
