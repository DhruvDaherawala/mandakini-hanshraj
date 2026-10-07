import 'server-only';
import { randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { v2 as cloudinary } from 'cloudinary';
import type { ImageAsset } from '../types';
import { catalogTransaction } from './db';
import { imageReferenced } from './references';
import { required, UPLOAD_LIMIT } from './config';
import { fail } from './errors';
import { imageSchema, publicIdSchema } from './validation';

function cloud() {
  // Credentials remain server-only; no unsigned upload preset is exposed.
  cloudinary.config({ cloud_name: required('CLOUDINARY_CLOUD_NAME'), api_key: required('CLOUDINARY_API_KEY'), api_secret: required('CLOUDINARY_API_SECRET'), secure: true });
  return cloudinary;
}
export async function normalizeImage(bytes: Buffer, mime: string): Promise<Buffer> {
  if (!bytes.length || bytes.length > UPLOAD_LIMIT) fail(413, 'IMAGE_TOO_LARGE', 'Images must be at most 4 MiB.');
  const expected: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!expected[mime]) fail(415, 'UNSUPPORTED_IMAGE', 'Use JPEG, PNG or WebP. SVG and animated images are not accepted.');
  try {
    const image = sharp(bytes, { limitInputPixels: 24000000, failOn: 'warning', animated: false });
    const m = await image.metadata();
    if (m.format !== expected[mime] || !m.width || !m.height || m.width > 12000 || m.height > 12000 || (m.pages ?? 1) > 1) fail(422, 'INVALID_IMAGE', 'Invalid, animated or oversized image dimensions.');
    return await image.rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'INVALID_IMAGE') throw error;
    return fail(422, 'INVALID_IMAGE', 'The image could not be decoded safely.');
  }
}
export async function uploadImage(bytes: Buffer, mime: string, alt: string): Promise<ImageAsset> {
  const normalized = await normalizeImage(bytes, mime);
  const fileId = randomUUID();
  const id = `mandakini/${fileId}`;
  const service = cloud();
  let uploaded: { secure_url: string; public_id: string } | null = null;

  try {
    uploaded = await new Promise((resolve, reject) => {
      const stream = service.uploader.upload_stream({ public_id: id, resource_type: 'image', type: 'upload', overwrite: false, format: 'webp', timeout: 30000 }, (error, result) => {
        if (error || !result) reject(error ?? new Error('No upload result')); else resolve(result);
      });
      stream.on('error', reject);
      stream.end(normalized);
    });
  } catch (cloudErr) {
    console.warn('Cloudinary upload failed:', cloudErr instanceof Error ? cloudErr.message : cloudErr);
    return fail(502, 'UPLOAD_FAILED', 'Image upload failed. Please try again.');
  }

  if (!uploaded) return fail(502, 'UPLOAD_FAILED', 'Image upload failed. Please try again.');

  try {
    const asset = imageSchema.parse({ cloudinaryUrl: uploaded.secure_url, cloudinaryPublicId: uploaded.public_id, alt });
    await catalogTransaction(async (t, session) => {
      await t.media.insertOne({ _id: randomUUID(), ...asset, kind: 'cloudinary', state: 'active', createdAt: new Date() }, { session });
      return true;
    });
    return asset;
  } catch (error) {
    if (uploaded) {
      try { await cloud().uploader.destroy(uploaded.public_id, { resource_type: 'image', invalidate: true }); }
      catch { console.error('Upload registration failed; Cloudinary orphan cleanup requires operator review.'); }
    }
    throw error;
  }
}
export async function deleteImage(publicId: string): Promise<{ ok: true }> {
  publicIdSchema.parse(publicId);
  const asset = await catalogTransaction(async (t, session) => {
    const found = await t.media.findOne({ cloudinaryPublicId: publicId }, { session });
    if (!found) return null;
    if (await imageReferenced(t, session, publicId)) fail(409, 'IMAGE_REFERENCED', 'Remove this image from every product, variant, category, content block and settings field first.');
    await t.media.updateOne({ _id: found._id }, { $set: { state: 'deleting' } }, { session });
    return found;
  });
  if (!asset) return { ok: true };
  if (asset.kind === 'cloudinary') {
    try {
      const result = await cloud().uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true });
      if (!['ok', 'not found'].includes(result.result)) throw new Error('Unexpected deletion result');
    } catch { return fail(502, 'IMAGE_DELETE_PENDING', 'Cloud deletion failed. The image remains blocked for reuse; retry this deletion.'); }
  } else if (asset.kind === 'local' && publicId.startsWith('uploads/')) {
    try {
      const fileId = publicId.replace(/^uploads\//, '');
      await unlink(path.join(process.cwd(), 'public', 'uploads', `${fileId}.webp`)).catch(() => {});
    } catch {}
  }
  await catalogTransaction(async (t, session) => {
    await t.media.deleteOne({ _id: asset._id, state: 'deleting' }, { session }); return true;
  });
  return { ok: true };
}

