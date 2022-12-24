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
        title: 'Ecommerce Site',
        error: err,
        data: results,
      });
    }
  );
};

exports.productList = (req, res) => {
  res.send('NOT IMPLEMENTED: Product List');
};

exports.productDetail = (req, res) => {
  res.send(`NOT IMPLEMENTED: Product Detail ${req.params.id}`);
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
