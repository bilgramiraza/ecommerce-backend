const express = require('express');
const router = express.Router();
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

const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');

//PRODUCTS ROUTES //
//Website HomePage
router.get('/', productController.index);

//Product Creation Page
router.get('/product/create', productController.productCreateGet);
router.post(
  '/product/create',
  uploadMiddleware.array('productImage', 5),
  productController.productCreatePost
);

//Product Deletion Page
router.get('/product/:id/delete', productController.productDeleteGet);
router.post('/product/:id/delete', productController.productDeletePost);

//Product Update Page
router.get('/product/:id/update', productController.productUpdateGet);
router.post('/product/:id/update', productController.productUpdatePost);

//Product Details Page
router.get('/product/:id', productController.productDetail);

//List All Products
router.get('/products', productController.productList);

//CATEGORY ROUTES//
//Category Creation Page
router.get('/category/create', categoryController.categoryCreateGet);
router.post('/category/create', categoryController.categoryCreatePost);

//Category Deletion Page
router.get('/category/:id/delete', categoryController.categoryDeleteGet);
router.post('/category/:id/delete', categoryController.categoryDeletePost);

//Category Update Page
router.get('/category/:id/update', categoryController.categoryUpdateGet);
router.post('/category/:id/update', categoryController.categoryUpdatePost);

//Category Details Page
router.get('/category/:id', categoryController.categoryDetail);

//List All Categories
router.get('/categories', categoryController.categoryList);

module.exports = router;
