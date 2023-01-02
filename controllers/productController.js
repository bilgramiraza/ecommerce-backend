const Product = require('../models/product');
const Category = require('../models/category');

const async = require('async');

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

exports.productCreateGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Create GET');
};

exports.productCreatePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Product Create POST');
};

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
