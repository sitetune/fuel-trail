export async function compressDisplayCopy(file: File): Promise<Blob> {
  const imageCompression = (await import("browser-image-compression")).default;
  return imageCompression(file, {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
  });
}
