const express = require('express');
const uploadMiddleware = require('../middlewares/uploadImages');
const router = express.Router();

const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');

//PRODUCTS ROUTES //
//Website HomePage
router.get('/', productController.index);

//Product Creation Page
router.get('/product/create', productController.productCreateGet);
router.post(
  '/product/create',
  uploadMiddleware.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'descriptionImages', maxCount: 5 },
  ]),
  productController.productCreatePost
);

//Product Deletion Page
router.get('/product/:id/delete', productController.productDeleteGet);
router.post('/product/:id/delete', productController.productDeletePost);

//Product Update Page
router.get('/product/:id/update', productController.productUpdateGet);
router.post('/product/:id/update',
  uploadMiddleware.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'descriptionImages', maxCount: 5 },
  ]),
  productController.productUpdatePost);

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
