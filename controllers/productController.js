const Product = require('../models/product');
const Category = require('../models/category');

const async = require('async');
const { body, validationResult } = require('express-validator');

// Export a function that handles the request to the '/inventory' route AKA the HomePage
exports.index = (req, res, next) => {
  async.parallel(
    {
      // Query the Product collection and get the count of documents
      productCount(callback) {
        Product.countDocuments({}, callback);
      },
      // Query the Category collection and get the count of documents
      categoryCount(callback) {
        Category.countDocuments({}, callback);
      },
    },
    (err, { productCount, categoryCount }) => {
      if (err) return next(err);
      res.render('index', {
        title: 'Ecommerce Dashboard',
        productCount,
        categoryCount,
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
        deleteUrl: productDetails.url + '/delete',
        updateUrl: productDetails.url + '/update',
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
        title: 'Add Product Details',
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
          // Converting the Error object Array to a simple JS object for easy
          // error Handling on client side
          const errorObject = errors.array().reduce((arr, cur) => {
            // For each error in the array of errors, add the error's `param`
            // as a key to `errorObject` and the error's `msg` as the value associated with that key
            arr[cur.param] = cur.msg;
            return arr;
          }, {}); // start with an empty object as the accumulator `err`
          res.render('productForm', {
            title: 'Add Product Details',
            name: req.body.name,
            description: req.body.description,
            SKU: req.body.sku,
            category: req.body.category,
            quantity: req.body.quantity,
            price: req.body.price,
            categories: categoryList,
            errors: errorObject,
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

exports.productDeleteGet = (req, res, next) => {
  Product.findById(req.params.id)
    .populate('category')
    .lean()
    .exec((err, product) => {
      if (err) return next(err);
      if (product === null) res.redirect('/inventory/products');
      res.render('productDelete', {
        title: 'Delete Product',
        product,
      });
    });
};

exports.productDeletePost = (req, res, next) => {
  Product.findById(req.body.productId).exec((err, product) => {
    if (err) return next(err);
    Product.findByIdAndDelete(req.body.productId, (err) => {
      if (err) return next(err);
      res.redirect('/inventory/products');
    });
  });
};

exports.productUpdateGet = (req, res, next) => {
  async.parallel(
    {
      product(callback) {
        Product.findById(req.params.id).populate('category').lean().exec(callback);
      },
      categories(callback) {
        Category.find({}).select('name').lean().sort({ name: 1 }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);
      if (results.product == null) {
        const err = new Error('Product Not Found');
        err.status = 404;
        return next(err);
      }
      res.render('productForm', {
        title: 'Update Product Details',
        name: results.product.name,
        description: results.product.description,
        SKU: results.product.SKU,
        category: results.product.category._id.toString(),
        quantity: results.product.quantity,
        price: results.product.price,
        categories: results.categories,
      });
    }
  );
};

exports.productUpdatePost = [
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
    if (!errors.isEmpty()) {
      Category.find({})
        .select('name')
        .lean()
        .sort({ name: 1 })
        .exec((err, categories) => {
          if (err) return next(err);
          const errorObject = errors.array().reduce((arr, cur) => {
            arr[cur.param] = cur.msg;
            return arr;
          }, {});
          res.render('productForm', {
            title: 'Update Product Details',
            name: req.body.name,
            description: req.body.description,
            SKU: req.body.sku,
            category: req.body.category,
            quantity: req.body.quantity,
            price: req.body.price,
            categories,
            errors: errorObject,
          });
        });
      return;
    }
    const updatedProduct = new Product({
      name: req.body.name,
      description: req.body.description,
      SKU: req.body.sku,
      category: req.body.category,
      quantity: req.body.quantity,
      price: req.body.price,
      _id: req.params.id,
    });
    Product.findByIdAndUpdate(req.params.id, updatedProduct, {}, (err, product) => {
      if (err) return next(err);
      res.redirect(product.url);
    });
  },
];
