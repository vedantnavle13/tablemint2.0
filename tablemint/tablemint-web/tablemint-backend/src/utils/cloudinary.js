'use strict';
const cloudinary = require('cloudinary').v2;

// ── Configure Cloudinary from env ─────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true, // always return https URLs
});

/**
 * Upload a Buffer to Cloudinary.
 *
 * @param {Buffer} buffer         - Raw file buffer (from Multer memory storage)
 * @param {object} options        - Cloudinary upload options
 * @param {string} options.folder - Destination folder in Cloudinary
 * @param {string} [options.resource_type='auto'] - 'image' | 'video' | 'auto'
 * @param {string} [options.public_id]            - Optional custom public_id
 * @returns {Promise<{url: string, publicId: string, resourceType: string, width?: number, height?: number, format: string}>}
 */
exports.uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      resource_type: 'auto',
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve({
        url:          result.secure_url,
        publicId:     result.public_id,
        resourceType: result.resource_type,
        width:        result.width,
        height:       result.height,
        format:       result.format,
        bytes:        result.bytes,
      });
    });

    stream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by its public_id.
 *
 * @param {string} publicId       - Cloudinary public_id to delete
 * @param {'image'|'video'|'raw'} [resourceType='image']
 * @returns {Promise<object>}     - Cloudinary deletion result
 */
exports.deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (err) {
    // Log but don't throw — a failed delete shouldn't break the user flow
    console.error(`[Cloudinary] Failed to delete ${publicId}:`, err.message);
    return { result: 'error', error: err.message };
  }
};

/**
 * Upload multiple Buffers in parallel with a concurrency cap.
 *
 * @param {Array<{buffer: Buffer, mimetype: string, originalname: string}>} files
 * @param {object} baseOptions - Cloudinary upload options applied to all files
 * @returns {Promise<Array>}
 */
exports.uploadManyToCloudinary = async (files, baseOptions = {}) => {
  const { uploadToCloudinary } = exports;

  const results = await Promise.all(
    files.map((file) => {
      // Determine resource type from mimetype
      const resourceType = file.mimetype.startsWith('video/') ? 'video' : 'image';
      return uploadToCloudinary(file.buffer, { ...baseOptions, resource_type: resourceType });
    })
  );

  return results;
};
