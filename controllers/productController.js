const Product = require('../models/product');

exports.index = (req, res) => {
  res.send('NOT IMPLEMENTED: Site Home Page');
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
