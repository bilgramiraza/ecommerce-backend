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
        deleteUrl: results.category.url + '/delete',
      });
    }
  );
};

// Export a function that handles the request to the '/category/create' Get route
exports.categoryCreateGet = (req, res, next) => {
  res.render('categoryForm', { title: 'Add Category Details' });
};

// Export a function that handles the request to the '/category/create' Post route
exports.categoryCreatePost = [
  body('name', 'Category Name Required').trim().isLength({ min: 1 }).escape(),
  body('description', 'Category Description Missing').trim().isLength({ min: 1 }).escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    //If the returned data had failed validation, We reload the page and
    //return all the entered data And all the Mistakes made by the user
    //Destructured Category to avoid Handlebars Security flaw issue
    if (!errors.isEmpty()) {
      // Converting the Error object Array to a simple JS object for easy
      // error Handling on client side
      const errorObject = errors.array().reduce((arr, cur) => {
        // For each error in the array of errors, add the error's `param`
        // as a key to `errorObject` and the error's `msg` as the value associated with that key
        arr[cur.param] = cur.msg;
        return arr;
      }, {}); // start with an empty object as the accumulator `err`
      res.render('categoryForm', {
        title: 'Add Category Details',
        name: req.body.name,
        description: req.body.description,
        errors: errorObject,
      });
      return;
    } else {
      //If the Data passes validation We check for duplicates of this data
      //If duplicates are found we redirect to the existing categories page
      //Else we save it and redirect to the new categories page
      const category = new Category({
        name: req.body.name,
        description: req.body.description,
      });
      Category.findOne({ name: req.body.name }).exec((err, foundCategory) => {
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

exports.categoryDeleteGet = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.params.id).lean().exec(callback);
      },
      productsInCategory(callback) {
        Product.find({ category: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);
      if (results.category == null) res.redirect('/inventory/categories');

      // Create a new array of products based on the array of productsInCategory,
      // but convert each product document to a plain JavaScript object & include its virtuals
      const productsList = results.productsInCategory.map((product) =>
        product.toObject({ virtuals: true })
      );
      res.render('categoryDelete', {
        title: 'Delete Category',
        category: results.category,
        productsList,
      });
    }
  );
};

exports.categoryDeletePost = (req, res, next) => {
  async.parallel(
    {
      category(callback) {
        Category.findById(req.body.categoryId).lean().exec(callback);
      },
      productsInCategory(callback) {
        Product.find({ category: req.body.categoryId }).exec(callback);
      },
    },
    (err, results) => {
      if (err) return next(err);
      if (results.productsInCategory.length > 0) {
        // Create a new array of products based on the array of productsInCategory,
        // but convert each product document to a plain JavaScript object & include its virtuals
        const productsList = results.productsInCategory.map((product) =>
          product.toObject({ virtuals: true })
        );
        res.render('categoryDelete', {
          title: 'Delete Category',
          category: results.category,
          productsList,
        });
        return;
      }
      Category.findByIdAndDelete(req.body.categoryId, (err) => {
        if (err) return next(err);
        res.redirect('/inventory/categories');
      });
    }
  );
};

exports.categoryUpdateGet = (req, res, next) => {
  Category.findById(req.params.id)
    .lean()
    .exec((err, category) => {
      if (err) next(err);
      if (category == null) {
        const error = new Error('Category Not Found');
        error.status = 404;
        return next(error);
      }
      res.render('categoryForm', {
        title: 'Update Category Details',
        ...category,
      });
    });
};

exports.categoryUpdatePost = [
  body('name', 'Category Name Required').trim().isLength({ min: 1 }).escape(),
  body('description', 'Category Description Missing').trim().isLength({ min: 1 }).escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorObject = errors.array().reduce((arr, cur) => {
        arr[cur.param] = cur.msg;
        return arr;
      }, {});
      res.render('categoryForm', {
        title: 'Update Cateogory Details',
        name: req.body.name,
        description: req.body.description,
        errors: errorObject,
      });
      return;
    }
    const updatedCategory = new Category({
      name: req.body.name,
      description: req.body.description,
      _id: req.params.id,
    });
    Category.findByIdAndUpdate(req.params.id, updatedCategory, {}, (err, category) => {
      if (err) return next(err);
      res.redirect(category.url);
    });
  },
];
