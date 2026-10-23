import { MAX_IMAGE_BYTES } from "@/lib/poster";

export async function readImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("请选择 PNG、JPEG 或 WebP 图片");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("图片不能超过 12 MB");
  }
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("无法读取这张图片，请换一张重试");
  });
  try {
    if (image.width * image.height > 80_000_000) {
      throw new Error("图片像素过大，请先缩小至 8000 万像素以内");
    }
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("当前浏览器无法处理图片");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.94);
  } finally {
    image.close();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
