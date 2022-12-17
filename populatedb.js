#! /usr/bin/env node

console.log('Initiating Population of Database with mock Data');

const userArgs = process.argv.slice(2);

if (!userArgs[0].startsWith('mongodb')) {
  console.log("ERROR: Invalid Command Syntax 'populatedb mongodbURI'");
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
db.on('error', console.error.bind(console, 'MongoDB Connection Error: '));
