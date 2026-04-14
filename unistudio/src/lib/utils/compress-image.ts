/**
 * Client-side image compression to stay under Vercel's 4.5MB body limit.
 * Resizes to max 2048px and compresses to JPEG 85% if file > 3MB.
 */
export async function compressImageFile(file: File, maxSizeKB = 3000): Promise<File> {
  if (file.size <= maxSizeKB * 1024) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 2048 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
        "image/jpeg",
        0.85,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress a File before uploading to stay under Vercel's 4.5MB body limit.
 * Tries decreasing JPEG quality levels until the file is under maxSizeMB.
 * Skips compression if the file is already small enough.
 */
export async function compressForUpload(file: File, maxSizeMB = 3.5, maxDim = 2048): Promise<File> {
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = url; });
  URL.revokeObjectURL(url);

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  const outputName = file.name.replace(/\.\w+$/, ".jpg");

  for (let quality = 0.85; quality >= 0.5; quality -= 0.1) {
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
    );
    if (blob.size <= maxSizeMB * 1024 * 1024) {
      return new File([blob], outputName, { type: "image/jpeg" });
    }
  }

  // Last resort: minimum quality
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.5)
  );
  return new File([blob], outputName, { type: "image/jpeg" });
}
