const Category = require('../models/category');
const Product = require('../models/product');
const async = require('async');
const { body, validationResult } = require('express-validator');

// Export a function that handles the request to the '/categories' route
exports.categoryList = (req, res, next) => {
  // Find all categories in the 'Category' collection and
  ///return only the 'name', 'description' properties
  Category.find({}, 'name description')
    .sort({ name: 1 })
    .exec((err, listCategories) => {
      if (err) return next(err);
      // To avoid a security exploit, Handlebars cannot access properties of Mongoose objects directly
      // Hence, we are required to manually Specify the values that handlebars can access
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

// Export a function that handles the request to the '/category/:id' route
exports.categoryDetail = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        // Find the category with the specified ID
        Category.findById(req.params.id).exec(callback);
      },
      categoryProducts(callback) {
        // Find the products with the specified category ID
        Product.find({ category: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);
      // If the category is not found, create an error object with a
      //'Category not Found' message and a 404 status code
      if (results.category == null) {
        const err = new Error('Category not Found');
        err.status = 404;
        return next(err);
      }
      // To avoid a security exploit, Handlebars cannot access properties of Mongoose objects directly
      // Hence, we are required to manually Specify the values that handlebars can access
      const copiedCategoryProducts = results.categoryProducts.map((product) => {
        return {
          url: product.url,
          name: product.name,
          description: product.description,
          quantity: product.quantity,
          price: product.price,
        };
      });
      res.render('categoryDetail', {
        title: results.category.name,
        categoryDescription: results.category.description,
        categoryProducts: copiedCategoryProducts,
      });
    }
  );
};

exports.categoryCreateGet = (req, res, next) => {
  res.render('categoryForm', { title: 'Create Category' });
};

exports.categoryCreatePost = [
  body('name', 'Category Name Required').trim().isLength({ min: 1 }).escape(),
  body('description', 'Category Description Missing').trim().isLength({ min: 1 }).escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
    });

    if (!errors.isEmpty()) {
      res.render('categoryForm', {
        title: 'Create Category',
        category,
        errors: errors.array(),
      });
      return;
    } else {
      category.findOne({ name: req.body.name }).exec((err, foundCategory) => {
        if (err) return next(err);
        if (foundCategory) res.redirect(foundCategory.url);
        category.save((err) => {
          if (err) return next(err);
          res.redirect(category.url);
        });
      });
    }
  },
];

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
