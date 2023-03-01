const Product = require('../models/product');
const Category = require('../models/category');
const { body, validationResult } = require('express-validator');

// Export a function that handles the request to the '/inventory' route AKA the HomePage
exports.index = async (req, res, next) => {
  try {
    // Query the Product collection and get the count of documents
    const productCount = await Product.countDocuments({}).exec();
    // Query the Category collection and get the count of documents
    const categoryCount = await Category.countDocuments({}).exec();
    res.render('index', {
      title: 'Ecommerce Dashboard',
      productCount,
      categoryCount,
    });
  } catch (err) {
    return next(err);
  }
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

// Export a function that handles the request to the '/product/:id/delete' Post route
exports.productDeletePost = async (req, res, next) => {
  try {
    // Find and delete the product with the specified ID
    const product = await Product.findByIdAndDelete(req.body.productId).exec();
    // If the product was not found, we could optionally display a custom error page or message
    // However, in this implementation we will simply redirect the user to the products page
    // without displaying any error message
    /*
    if (!product) {
      // Do something here, such as displaying an error page or message to the user
    }
    */
    return res.redirect('/inventory/products');
  } catch (err) {
    // If an error occurs, forward it to the error handler middleware
    return next(err);
  }
};

// Export a function that handles the request to the '/product/:id/update' Get route
exports.productUpdateGet = async (req, res, next) => {
  try {
    // Find the product with the specified ID and populate its `category` field
    const product = await Product.findById(req.params.id).populate('category').lean().exec();
    // If the product is not found, return a 404 error to the error handling middleware
    if (!product) {
      const err = new Error('Product Not Found');
      err.status = 404;
      return next(err);
    }
    // Find all categories and sort them by name
    const categories = await Category.find({}).select('name').lean().sort({ name: 1 }).exec();

    // Find all categories and sort them by name
    const { name, description, SKU, category, quantity, price } = product;
    // Render the product form with the retrieved data
    res.render('productForm', {
      title: 'Update Product Details',
      name,
      description,
      SKU,
      category: category._id.toString(),
      quantity,
      price,
      categories,
    });
  } catch (err) {
    // If an error occurs, forward it to the error handler middleware
    return next(err);
  }
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
