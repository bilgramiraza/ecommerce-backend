const Category = require('../models/category');
const async = require('async');

// Export a function that handles the request to the '/products' route
exports.categoryList = (req, res, next) => {
  // Find all products in the 'Category' collection and
  ///return only the 'name', 'description' properties
  Category.find({}, 'name description')
    .sort({ name: 1 })
    .exec((err, listCategories) => {
      if (err) return next(err);
      //To avoid an security expliot Handlebars cannot access properties of mongoose objects directly
      //Hence, we are required to manually copy the properties to another variable
      const copiedListCategories = listCategories.map((category) => {
        return {
          name: category.name,
          description: category.description,
          url: category.url,
        };
      });
      res.render('categoryList', {
        title: 'Categories',
        categories: copiedListCategories,
      });
    });
};

exports.categoryDetail = (req, res) => {};

exports.categoryCreateGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Create GET');
};

exports.categoryCreatePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Create POST');
};

exports.categoryDeleteGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Delete GET');
};

exports.categoryDeletePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Delete POST');
};

exports.categoryUpdateGet = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Update GET');
};

exports.categoryUpdatePost = (req, res) => {
  res.send('NOT IMPLEMENTED: Category Update POST');
};
