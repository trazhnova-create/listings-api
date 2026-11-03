const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const authenticate = require('../middleware/auth');


const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
function validateObjectId(req, res, next, value) {
  if (!OBJECT_ID_RE.test(value)) {
    return res.status(400).json({ error: 'Некорректный идентификатор' });
  }
  next();
}
router.param('id', validateObjectId);
router.param('commentId', validateObjectId);


const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)),
});


router.get('/', listingsController.getAllListings);


router.post(
  '/upload',
  authenticate,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Файл больше 5 МБ' : err.message;
        return res.status(400).json({ error: msg });
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Нужен файл-изображение (jpeg, png, webp, gif)' });
    }
    res.status(201).json({ url: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` });
  }
);

router.get('/:id', listingsController.getListingById);


router.post('/', authenticate, listingsController.createListing);
router.put('/:id', authenticate, listingsController.updateListing);
router.delete('/:id', authenticate, listingsController.deleteListing);


router.post('/:id/comments', authenticate, listingsController.addComment);
router.post('/:id/comments/:commentId/like', authenticate, listingsController.likeComment);
router.delete('/:id/comments/:commentId', authenticate, listingsController.deleteComment);

module.exports = router;