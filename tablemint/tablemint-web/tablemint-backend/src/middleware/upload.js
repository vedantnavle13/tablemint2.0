'use strict';
const multer = require('multer');
const AppError = require('../utils/AppError');

// ── In-memory storage (no disk writes) ───────────────────────────────────────
const storage = multer.memoryStorage();

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Build a multer file-filter that accepts explicit mime-type prefixes.
 * @param {string[]} allowedTypes - e.g. ['image/'] or ['image/', 'video/']
 */
const buildFileFilter = (allowedTypes) => (req, file, cb) => {
  const allowed = allowedTypes.some((prefix) => file.mimetype.startsWith(prefix));
  if (!allowed) {
    return cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Allowed: ${allowedTypes.join(', ')} files only.`,
        400
      ),
      false
    );
  }
  cb(null, true);
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Restaurant photos — images only, max 10 files, 10 MB each
// ─────────────────────────────────────────────────────────────────────────────
exports.restaurantPhotosUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 },
  fileFilter: buildFileFilter(['image/']),
}).array('photos', 10);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Review media — images + videos, max 5 files, 50 MB each
// ─────────────────────────────────────────────────────────────────────────────
exports.reviewMediaUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 5 },
  fileFilter: buildFileFilter(['image/', 'video/']),
}).array('media', 5);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Menu item image — single image, 5 MB
// ─────────────────────────────────────────────────────────────────────────────
exports.menuItemImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: buildFileFilter(['image/']),
}).single('image');

// ─────────────────────────────────────────────────────────────────────────────
// 4. Multer error handler middleware — call after any multer upload
//    Usage: router.post('/route', uploadMiddleware, handleMulterError, controller)
// ─────────────────────────────────────────────────────────────────────────────
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Check the size limit for this upload.', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files uploaded at once.', 400));
    }
    return next(new AppError(`Upload error: ${err.message}`, 400));
  }
  // Could be our custom AppError from fileFilter
  if (err) return next(err);
  next();
};
