const Product = require('../models/product');
const Category = require('../models/category');

const async = require('async');
const { body, validationResult } = require('express-validator');

exports.index = (req, res) => {
  async.parallel(
    {
      productCount(callback) {
        Product.countDocuments({}, callback);
      },
      categoryCount(callback) {
        Category.countDocuments({}, callback);
      },
    },
    (err, results) => {
      res.render('index', {
        title: 'Ecommerce Dashboard',
        error: err,
        data: results,
      });
    }
  );
};

// Export a function that handles the request to the '/products' route
exports.productList = (req, res, next) => {
  // Find all products in the 'Product' collection and
  ///return only the 'name', 'category', and 'quantity' properties
  Product.find({}, 'name category quantity')
    .sort({ name: 1 })
    .populate('category')
    .exec((err, listProducts) => {
      if (err) return next(err);
      //To avoid an security expliot Handlebars cannot access properties of mongoose objects directly
      //Hence, we are required to manually copy the properties to another variable
      const copiedListProducts = listProducts.map((product) => {
        return {
          name: product.name,
          category: product.category.name,
          quantity: product.quantity,
          url: product.url,
        };
      });
      res.render('productList', {
        title: 'Products',
        products: copiedListProducts,
      });
    });
};

// Export a function that handles the request to the '/product/:id' route
exports.productDetail = (req, res, next) => {
  // Find the Product in the 'Product' collection and
  ///return its properties
  Product.findById(req.params.id)
    .populate('category')
    .exec((err, productDetails) => {
      if (err) return next(err);
      if (productDetails == null) {
        const err = new Error('Product not Found');
        err.status = 404;
        return next(err);
      }
      const categoryDetails = {
        name: productDetails.category.name,
        url: productDetails.category.url,
      };
      res.render('productDetail', {
        title: productDetails.name,
        description: productDetails.description,
        SKU: productDetails.SKU,
        category: categoryDetails,
        quantity: productDetails.quantity,
        price: productDetails.price,
      });
    });
};

// Export a function that handles the request to the '/product/create' Get route
exports.productCreateGet = (req, res, next) => {
  //Find all categories in the database, select only name property,
  //and return a JS object containing the _id and name values
  Category.find({})
    .select('name')
    .lean()
    .sort({ name: 1 })
    .exec((err, categoryList) => {
      if (err) return next(err);
      //We don't need to copy items into a new variable since the lean option
      //returns a JS object rather than a mongoose document
      res.render('productForm', {
        title: 'Add Product',
        categories: categoryList,
      });
    });
};

// Export a function that handles the request to the '/product/create' Post route
exports.productCreatePost = [
  body('name', 'Product Name must be specified').trim().isLength({ min: 1 }).escape(),
  body('description', 'Product Description must be specified')
    .trim()
    .isLength({ min: 1, max: 500 })
    .escape(),
  body('sku', 'Product SKU must be specified').trim().isLength({ min: 1 }).escape(),
  body('category', 'Product Category must be specified').trim().isLength({ min: 1 }).escape(),
  body('quantity', 'Product Quantity must be specified')
    .isInt({ gt: 0 })
    .withMessage('Product Quantity must be an Positive Number'),
  body('price', 'Product Price must be specified')
    .isFloat({ gt: 0 })
    .withMessage('The Product Price must be a positive number'),
  (req, res, next) => {
    const errors = validationResult(req);
    //If the returned data had failed validation, We reload the page and
    //return all the entered data And all the Mistakes made by the user
    //Destructured Category to avoid Handlebars Security flaw issue
    if (!errors.isEmpty()) {
      Category.find({})
        .select('name')
        .lean()
        .sort({ name: 1 })
        .exec((err, categoryList) => {
          if (err) return next(err);
          res.render('productForm', {
            title: 'Add Product',
            name: req.body.name,
            description: req.body.description,
            SKU: req.body.sku,
            category: req.body.category,
            quantity: req.body.quantity,
            price: req.body.price,
            categories: categoryList,
            errors: errors.array(),
          });
        });
      return;
    } else {
      //If the Data passes validation We check for duplicates of this data
      //If duplicates are found we redirect to the existing product page
      //Else we save it and redirect to the new product page
      const product = new Product({
        name: req.body.name,
        description: req.body.description,
        SKU: req.body.sku,
        category: req.body.category,
        quantity: req.body.quantity,
        price: req.body.price,
      });
      Product.findOne({ name: req.body.name }).exec((err, foundProduct) => {
        if (err) return next(err);
        if (foundProduct) res.redirect(foundProduct.url);
        product.save((err) => {
          if (err) return next(err);
          res.redirect(product.url);
        });
      });
    }
  },
];

exports.productDeleteGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Delete GET');
};

exports.productDeletePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Delete POST');
};

exports.productUpdateGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Update GET');
};

exports.productUpdatePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Update POST');
};
