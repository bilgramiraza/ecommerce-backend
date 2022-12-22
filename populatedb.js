#! /usr/bin/env node

console.log('Initiating Population of Database with mock Data');

// slice the first two elements of the process.argv array to get the user arguments
const userArgs = process.argv.slice(2);

// check if the first argument starts with 'mongodb' and exit the script if the argument is invalid
if (!userArgs[0].startsWith('mongodb')) {
  console.log("ERROR: Invalid Command Syntax 'populatedb <mongodbURI>'");
  return;
}

const async = require('async');
const Product = require('./models/product');
const Category = require('./models/category');

const mongoose = require('mongoose');
const mongodbURI = userArgs[0];
const mongodbParams = { useNewUrlParser: true, useUnifiedTopology: true };
mongoose.connect(mongodbURI, mongodbParams);
mongoose.Promise = global.Promise;
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB Connection Error: ')); // log an error if there is a problem with the database connection

// initialize an empty array to store the products and the categories
let products = [];
let categories = [];

/**
 * Create a new product instance and save it to the database
 * @param {String} name - the name of the product
 * @param {String} description - the description of the product
 * @param {String} SKU - the Stock Keeping Unit of the product
 * @param {Object} category - the category of the product
 * @param {Number} quantity - the quantity of the product
 * @param {Number} price - the price of the product
 * @param {Function} callback - the callback function to be called after the product is saved
 */

function productCreate(name, description, SKU, category, quantity, price, callback) {
  let productDetails = { name, description, SKU, category, quantity, price };

  let product = new Product(productDetails);
  product.save((err) => {
    if (err) {
      callback(err, null);
      return;
    }
    console.log(`New Product: ${product.name}`);
    products.push(product);
    callback(null, product);
  });
}

/**
 * Create a new category instance and save it to the database
 * @param {String} name - the name of the category
 * @param {String} description - the description of the category
 * @param {Function} callback - the callback function to be called after the category is saved
 */

function categoryCreate(name, description, callback) {
  let categoryDetails = { name, description };
  let category = new Category(categoryDetails);
  category.save((err) => {
    if (err) {
      callback(err, null);
      return;
    }
    console.log(`New Category: ${category.name}`);
    categories.push(category);
    callback(null, category);
  });
}

/**
 * Create several instances of Category in parallel
 * @param {Function} cb - the callback function to be called after all the categories are created
 */

function createCategories(cb) {
  async.parallel(
    [
      (callback) => {
        categoryCreate('Solar panels', 'A category for solar panels', callback);
      },
      (callback) => {
        categoryCreate('Controllers', 'A category for controllers', callback);
      },
      (callback) => {
        categoryCreate('Lights', 'A category for 12V lights', callback);
      },
      (callback) => {
        categoryCreate('Fans', 'A category for 12V electric ceiling fans', callback);
      },
    ],
    cb
  );
}

/**
 * Create several instances of Product in parallel
 * @param {Function} cb - the callback function to be called after all the products are created
 */

function createProducts(cb) {
  async.parallel(
    [
      (callback) => {
        productCreate(
          'Solar panel 1',
          'A high-quality solar panel for home use',
          'SP-001',
          categories[0],
          10,
          500,
          callback
        );
      },
      (callback) => {
        productCreate(
          'Solar panel 2',
          'A premium solar panel for commercial use',
          'SP-002',
          categories[0],
          5,
          1000,
          callback
        );
      },
      (callback) => {
        productCreate(
          'Controller 1',
          'A robust controller for solar panel systems',
          'CT-001',
          categories[1],
          3,
          200,
          callback
        );
      },
      (callback) => {
        productCreate(
          'Light 1',
          'A bright 12V light for outdoor use',
          'LT-001',
          categories[2],
          20,
          50,
          callback
        );
      },
      (callback) => {
        productCreate(
          'Light 2',
          'A dimmable 12V light for indoor use',
          'LT-002',
          categories[2],
          10,
          75,
          callback
        );
      },
      (callback) => {
        productCreate(
          'Ceiling fan 1',
          'A quiet and energy-efficient 12V ceiling fan',
          'CF-001',
          categories[3],
          5,
          150,
          callback
        );
      },
    ],
    cb
  );
}

// use the async.series function to run the createCategories and createProducts functions in series
async.series([createCategories, createProducts], (err, results) => {
  if (err) return console.log(`Final Err: ${err}`);
  console.log('Databases Data Created.');
  mongoose.connection.close();
});
