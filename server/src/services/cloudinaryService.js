import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';

export const uploadPhoto = async (buffer, folder = 'sitebook/attendance') => {
  if (!cloudinary.config().cloud_name) {
    console.warn('Cloudinary not configured. Returning mock URL.');
    return { url: null, publicId: null, mock: true };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: { width: 800, height: 800, crop: 'limit', quality: 'auto' },
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

export const deletePhoto = async (publicId) => {
  if (!publicId) return;
  if (!cloudinary.config().cloud_name) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};
