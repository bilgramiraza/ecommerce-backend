const Category = require('../models/category');
const Product = require('../models/product');
const async = require('async');
const { body, validationResult } = require('express-validator');

// Export a function that handles the request to the '/categories' route
exports.categoryList = async (req, res, next) => {
  // Find all categories in the 'Category' collection
  try {
    // Find all categories in the 'Category' collection and sort by name
    const categoryMongoose = await Category.find({}).sort({ name: 1 }).exec();

    // Convert the Mongoose documents to plain JavaScript objects with virtual properties
    const categories = categoryMongoose.map((category) => category.toObject({ virtuals: true }));

    res.render('categoryList', {
      title: 'Categories',
      categories,
    });
  } catch (err) {
    next(err);
  }
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
        Product.find({ category: req.params.id }).sort({ name: 1 }).exec(callback);
      },
    },
    (err, { category, categoryProducts }) => {
      if (err) return next(err);
      // If the category is not found, create an error object with a
      //'Category not Found' message and a 404 status code
      if (!category) {
        const err = new Error('Category not Found');
        err.status = 404;
        return next(err);
      }
      // To avoid a security exploit, Handlebars cannot access properties of Mongoose objects
      // So we convert them to POJOs while maintaining their virtual properties.
      const products = categoryProducts.map((product) => product.toObject({ virtuals: true }));

      // Extract the relevant properties from the category object for convenience
      // and Render the 'categoryDetails' view
      const { name, description, url } = category;
      res.render('categoryDetail', {
        title: name,
        description,
        products,
        deleteUrl: `${url}/delete`,
        updateUrl: `${url}/update`,
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
  async (req, res, next) => {
    const errors = validationResult(req);
    //If the returned data had failed validation, We reload the page and
    //return all the entered data And all the Mistakes made by the user
    if (!errors.isEmpty()) {
      // Converting the Error object Array to a simple JS object for easy
      // error Handling on client side
      const errorArray = errors.array();
      // For each error in the array of errors, add the error's `param`
      // as a key to `errorObject` and the error's `msg` as the value associated with that key
      const errorObject = Object.fromEntries(errorArray.map((error) => [error.param, error.msg]));

      res.render('categoryForm', {
        title: 'Add Category Details',
        name: req.body.name,
        description: req.body.description,
        errors: errorObject,
      });
      return;
    }
    // Save the Data in a new Category Object to operate on it
    const category = new Category({
      name: req.body.name,
      description: req.body.description,
    });
    try {
      //If the Data passes validation We check for duplicates of this data
      const foundCategory = await Category.findOne({ name: req.body.name }).exec();

      //If duplicates are found we redirect to the existing categories page
      if (foundCategory) return res.redirect(foundCategory.url);

      //Else we save it and redirect to the new categories page
      await category.save();
      return res.redirect(category.url);
    } catch (err) {
      return next(err);
    }
  },
];

// Define the categoryDeleteGet controller function
exports.categoryDeleteGet = (req, res, next) => {
  async.parallel(
    {
      // Query to find the category by ID and convert the result to a plain JavaScript object
      category(callback) {
        Category.findById(req.params.id).lean().exec(callback);
      },
      // Query to find all products in the category and return them as documents
      productsInCategory(callback) {
        Product.find({ category: req.params.id }).exec(callback);
      },
    },
    (err, { category, productsInCategory }) => {
      if (err) return next(err);
      if (!category) res.redirect('/inventory/categories');

      // Convert each product document to a plain JavaScript object with virtuals
      const productsList = productsInCategory.map((product) =>
        product.toObject({ virtuals: true })
      );
      res.render('categoryDelete', {
        title: 'Delete Category',
        category,
        productsList,
      });
    }
  );
};

// Define a controller function for handling the category delete POST request
exports.categoryDeletePost = (req, res, next) => {
  async.parallel(
    {
      // Query the Category collection to find the category document to be deleted by its ID
      category(callback) {
        Category.findById(req.body.categoryId).lean().exec(callback);
      },
      // Query the Product collection to find all products that belong to the category to be deleted
      productsInCategory(callback) {
        Product.find({ category: req.body.categoryId }).exec(callback);
      },
    },
    (err, { category, productsInCategory }) => {
      if (err) return next(err);
      // If there are products in the category to be deleted,
      // Just rerender the page, since we don't allow you to delete categories
      // if they are attached to products
      if (productsInCategory.length > 0) {
        // Create a new array of products based on the array of productsInCategory,
        // but convert each product document to a plain JavaScript object & include its virtuals
        const productsList = productsInCategory.map((product) =>
          product.toObject({ virtuals: true })
        );
        res.render('categoryDelete', {
          title: 'Delete Category',
          category,
          productsList,
        });
        return;
      }
      // If there are no products under this category,
      //Delete it and and redirect user to the All categories List Page
      Category.findByIdAndDelete(req.body.categoryId, (err) => {
        if (err) return next(err);
        res.redirect('/inventory/categories');
      });
    }
  );
};

// This controller function handles GET requests to the category update form.
exports.categoryUpdateGet = async (req, res, next) => {
  try {
    // Try to find the category specified in the request URL by its ID
    const category = await Category.findById(req.params.id)
      // and convert it to a plain JavaScript object
      .lean()
      // If the category is not found, throw a 404 error with a custom message and status code
      .orFail({ statusCode: 404, message: 'Category Not Found' })
      .exec();
    res.render('categoryForm', {
      title: 'Update Category Details',
      ...category,
    });
  } catch (err) {
    return next(err);
  }
};

// This controller function handles POST requests to the category update form.
exports.categoryUpdatePost = [
  // Validate the name and description fields using express-validator
  body('name', 'Category Name Required').trim().isLength({ min: 1 }).escape(),
  body('description', 'Category Description Missing').trim().isLength({ min: 1 }).escape(),
  async (req, res, next) => {
    const errors = validationResult(req);
    const { name, description } = req.body;
    if (!errors.isEmpty()) {
      // For each error in the array of errors, add the error's `param`
      // as a key to `errorObject` and the error's `msg` as the value associated with that key
      const errorObject = Object.fromEntries(errorArray.map((error) => [error.param, error.msg]));
      res.render('categoryForm', {
        title: 'Update Cateogory Details',
        name,
        description,
        errors: errorObject,
      });
      return;
    }
    const category = new Category({
      name,
      description,
      _id: req.params.id,
    });
    try {
      // Find and update the category using findByIdAndUpdate() method and redirect to category page
      await Category.findByIdAndUpdate(req.params.id, category, { new: true });
      res.redirect(category.url);
    } catch (err) {
      // If an error occurs during category update, pass it to the next middleware for error handling
      return next(err);
    }
  },
];
