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
exports.productList = async (req, res, next) => {
  // Find all products in the 'Product' collection and
  ///return only the 'name', 'category', and 'quantity' properties
  try {
    const listProducts = await Product.find({}, 'name category quantity')
      .sort({ name: 1 })
      .populate({ path: 'category', select: 'name url' })
      .exec();

    // Create a new array of products with the required properties
    const products = listProducts.map((product) => {
      return {
        name: product.name,
        category: product.category.name,
        categoryUrl: product.category.url,
        quantity: product.quantity,
        productUrl: product.url,
      };
    });
    res.render('productList', {
      title: 'Products',
      products,
    });
  } catch (err) {
    return next(err);
  }
};

// Export a function that handles the request to the '/product/:id' route
exports.productDetail = async (req, res, next) => {
  try {
    // Find the Product in the 'Product' collection and
    ///return its properties
    const product = await Product.findById(req.params.id).populate('category').exec();
    // If no product is found, return a 404 error
    if (!product) {
      const err = new Error('Product not Found');
      err.status = 404;
      return next(err);
    }
    // Destructure the properties from the 'product' object
    // and assign them to variables with different names
    const {
      name: title,
      description,
      SKU: sku,
      category: { name: categoryName, url: categoryUrl },
      quantity,
      price,
      url,
    } = product;

    // Render the 'productDetail' view and pass in the required data
    res.render('productDetail', {
      title,
      description,
      sku,
      categoryName,
      categoryUrl,
      quantity,
      price,
      deleteUrl: `${url}/delete`,
      updateUrl: `${url}/update`,
    });
  } catch (err) {
    return next(err);
  }
};

// Export a function that handles the request to the '/product/create' Get route
exports.productCreateGet = async (req, res, next) => {
  try {
    // Find all categories in the database, select only name property,
    // and return a JS object containing the _id and name values
    // We Apply the lean function as well to get A Plain Old JavaScript Object
    // for better performance and better compatibility with handlebars
    const categories = await Category.find({}).select('name').lean().sort({ name: 1 }).exec();
    // We check if there are No categories present which is not allowed
    if (!categories.length) {
      const err = new Error('No Categories Found');
      err.status = 404;
      return next(err);
    }
    res.render('productForm', {
      title: 'Add Product Details',
      categories,
    });
  } catch (err) {
    return next(err);
  }
};

// Export a function that handles the request to the '/product/create' Post route
exports.productCreatePost = [
  // Validate that the fields in the form are present and have valid values
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
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      // Extract all the form data we get from the page using object Destructuring
      // for easier manipulation
      const { name, description, sku, category, quantity, price } = req.body;
      //If the returned data had failed validation, We reload the page and
      //return all the entered data And all the Mistakes made by the user
      if (!errors.isEmpty()) {
        // Converting the Error object Array to a simple JS object for easy
        // error Handling on client side
        const errorArray = errors.array();
        // For each error in the array of errors, add the error's `param`
        // as a key to `errorObject` and the error's `msg` as the value associated with that key
        const errorObject = Object.fromEntries(errorArray.map((error) => [error.param, error.msg]));

        // Retrieve all the categories from the database for use in the product form
        const categories = await Category.find({}).select('name').lean().sort({ name: 1 }).exec();
        // Retrieve all the categories from the database for use in the product form
        if (!categories.length) {
          const err = new Error('No Categories Found');
          err.status = 404;
          return next(err);
        }
        // Render the product form with the original data and the errors
        res.render('productForm', {
          title: 'Add Product Details',
          name,
          description,
          SKU: sku,
          category,
          quantity,
          price,
          categories,
          errors: errorObject,
        });
        return;
      }
      //If the Data passes validation We check for duplicates of this data
      const product = new Product({
        name,
        description,
        SKU: sku,
        category,
        quantity,
        price,
      });
      //If duplicates are found we redirect to the existing product page
      //Else we save it and redirect to the new product page
      const productLookUp = await Product.findOne({ name: name }).exec();
      if (productLookUp) return res.redirect(productLookUp.url);
      await product.save();
      return res.redirect(product.url);
    } catch (err) {
      // If an error occurs, forward it to the error handler middleware
      return next(err);
    }
  },
];

// Export a function that handles the request to the '/product/:id/delete' Get route
exports.productDeleteGet = async (req, res, next) => {
  try {
    // Find the product with the given ID,
    // and populate the 'category' field of the product document
    const product = await Product.findById(req.params.id).populate('category').lean().exec();

    // If no product was found, redirect to the All products page
    if (!product) return res.redirect('/inventory/products');

    // Render the product delete page with the product details
    res.render('productDelete', {
      title: 'Delete Product',
      product,
    });
  } catch (err) {
    // If an error occurs, forward it to the error handler middleware
    return next(err);
  }
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
