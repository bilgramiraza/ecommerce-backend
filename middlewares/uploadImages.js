const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: function (req, file, cb) {
    const date = Date.now();
    const randomNumber = Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const { fieldname } = file;
    const filename = `${fieldname}-${date}-${randomNumber}${extension}`;
    cb(null, filename);
  },
});
const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, //5MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
    if (!file || !allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, false);
    }
    return cb(null, true);
  },
});
module.exports = uploadMiddleware;
