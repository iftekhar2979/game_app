/**
 * Shared client half of the existing pre-signed S3 upload flow.
 *
 * The presign itself comes from the `getPreSignedUrl` RTK Query endpoint that
 * already backs avatar and league-logo uploads; this module only owns the PUT
 * for avatar, league-logo and league-chat images.
 */

export interface PickedImage {
  uri: string;
  fileName?: string | null;
  type?: string | null;
}

/** Presign trigger, i.e. the `useLazyGetPreSignedUrlQuery` trigger function. */
export type PresignTrigger = (args: {
  fileName: string;
  primaryPath: string;
  expiresIn: string;
}) => { unwrap: () => Promise<{ data: { url: string; key: string; method: string } }> };

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function buildFileName(image: PickedImage, index: number): string {
  if (image.fileName) return image.fileName;
  const extension = EXTENSION_BY_MIME[image.type || ''] || 'jpg';
  return `upload_${Date.now()}_${index}.${extension}`;
}

/**
 * Uploads one picked image and resolves to its S3 object key.
 *
 * The key — not the signed URL — is what gets persisted: signed URLs expire,
 * and the backend re-signs keys for viewing on every read.
 */
export async function uploadImage(
  image: PickedImage,
  presign: PresignTrigger,
  index = 0,
  primaryPath = 'Uploads',
): Promise<string> {
  const fileName = buildFileName(image, index);

  const presigned = await presign({ fileName, primaryPath, expiresIn: '300' }).unwrap();
  const { url, key } = presigned.data;

  const file = await fetch(image.uri);
  const blob = await file.blob();

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || image.type || 'image/jpeg' },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed for ${fileName} (${response.status})`);
  }

  return key;
}
