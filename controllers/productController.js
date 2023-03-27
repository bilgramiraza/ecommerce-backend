const Product = require('../models/product');
const Category = require('../models/category');
const { unlink } = require('node:fs/promises');
const { check, body, validationResult } = require('express-validator');

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
    const listProducts = await Product.find({}, 'name category quantity productImage')
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
        productImage: product?.productImage,
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
    .isInt({ min: 0 })
    .withMessage('Product Quantity must be an Positive Number'),
  body('price', 'Product Price must be specified')
    .isFloat({ min: 0 })
    .withMessage('The Product Price must be a positive number'),
  check('productImage').custom((value, { req }) => {
    //Custom Validator for Displaying Error message for invalid Image Inputs
    if (!req.files.productImage || !req.files.productImage.length) {
      throw new Error('No Images Uploaded, Only PNG/JPG/JPEG images Allowed');
    }
    return true;
  }),
  check('descriptionImages').custom((value, { req }) => {
    //Custom Validator for Displaying Error message for invalid Image Inputs
    if (!req.files.descriptionImages || !req.files.descriptionImages.length) {
      throw new Error('No Images Uploaded, Only PNG/JPG/JPEG images Allowed');
    }
    if (req.files.descriptionImages.length < 2) {
      throw new Error('Please Upload Atleast 2 Images');
    }
    return true;
  }),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      // Extract all the form data we get from the page using object Destructuring
      // for easier manipulation
      const { name, description, sku, category, quantity, price } = req.body;
      const { productImage, descriptionImages } = req.files;
      //If the returned data had failed validation, We reload the page and
      //return all the entered data And all the Mistakes made by the user
      if (!errors.isEmpty()) {
        //Deleting the uploaded Images before rerendering the page
        if (req && req.files) {
          const promises = [];
          if (productImage) {
            promises.push(unlink(productImage[0].path));
          }
          if (descriptionImages) {
            promises.push(
              ...descriptionImages.map((file) => {
                return unlink(file.path);
              })
            );
          }
          Promise.all(promises).catch((err) => next(err));
        }
        // Converting the Error object Array to a simple JS object for easy
        // error Handling on client side
        const errorArray = errors.array();
        // For each error in the array of errors, add the error's `param`
        // as a key to `errorObject` and the error's `msg` as the value associated with that key
        const errorObject = Object.fromEntries(errorArray.map((error) => [error.param, error.msg]));
        //If We get *Any* errors the user must Reupload their Images
        //This check Adds that Error Message for the user
        if (
          errorObject.hasOwnProperty('productImage') ||
          errorObject.hasOwnProperty('descriptionImages')
        ) {
          errorObject.images = true;
        }

        // Retrieve all the categories from the database for use in the product form
        const categories = await Category.find({}).select('name').lean().sort({ name: 1 }).exec();
        // If no categories are found, Redirect to error Page.
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
      //Extracting Details of the Uploaded Images
      const prodImageObject = {
        fileName: productImage[0].filename,
        path: productImage[0].path,
        mimeType: productImage[0].mimetype,
      };
      let descImagesObjectArray = [];
      if(descriptionImages){
        if(Array.isArray(descriptionImages)){
          descImagesObjectArray = descriptionImages.map(({ filename, path, mimetype }) => ({
            fileName: filename,
            path,
            mimeType: mimetype,
          }));
        }else{
          descImagesObjectArray = {
            fileName: descriptionImages.filename,
            path: descriptionImages.path,
            mimeType: descriptionImages.mimetype,
          }
        }
      }
      //If the Data passes validation We check for duplicates of this data
      const product = new Product({
        name,
        description,
        SKU: sku,
        category,
        quantity,
        price,
        productImage: prodImageObject,
        descriptionImages: descImagesObjectArray,
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
      ...product,
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
    //Deletes any Images of the product from the server
    if(product){
      const promises =[];
      if(product.productImage){
        promises.push(unlink(product.productImage.path));
      }
      if(product.descriptionImages){
        promises.push(...product.descriptionImages.map((file)=>unlink(file.path)));
      }
      Promise.all(promises).catch((err) => next(err));
    }
    // If the product was not found, we could optionally display a custom error page or message
    // However, in this implementation we will simply redirect the user to the products page
    // without displaying any error message

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

    const { name, description, SKU, category, quantity, price, productImage, descriptionImages } =
      product;
    // Render the product form with the retrieved data
    res.render('productForm', {
      title: 'Update Product Details',
      name,
      description,
      SKU,
      category: category._id.toString(),
      quantity,
      price,
      productImage,
      descriptionImages,
      categories,
    });
  } catch (err) {
    // If an error occurs, forward it to the error handler middleware
    return next(err);
  }
};

// Export a function that handles the request to the '/product/:id/update' Post route
exports.productUpdatePost = [
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
  body('delDescImages.*').escape(),
  async (req, res, next) => {
    try {      
      const errors = validationResult(req);
      // Extract all the form data we get from the page using object Destructuring
      // for easier manipulation
      const { name, description, sku, category, quantity, price, delDescImages} = req.body;
      const {productImage:newProductImage, descriptionImages:newDescriptionImages} = req.files;
      //If the returned data had failed validation, We reload the page and
      //return all the entered data And all the Mistakes made by the user
      const {productImage:oldProductImage, descriptionImages:oldDescriptionImages} = await Product.findById(req.params.id).select('productImage descriptionImages').lean().exec();
   
      if (!errors.isEmpty()) {
        //Delete the Uploaded Images before Rerendering The Page
        if (req && req.files) {
          const promises = [];
          if (newProductImage) {
            promises.push(unlink(newProductImage[0].path));
          }
          if (newDescriptionImages) {
            promises.push(
              ...newDescriptionImages.map((file) => {
                return unlink(file.path);
              })
            );
          }
          Promise.all(promises).catch((err) => next(err));
        }

        // Converting the Error object Array to a simple JS object for easy
        // error Handling on client side
        const errorArray = errors.array();
        // For each error in the array of errors, add the error's `param`
        // as a key to `errorObject` and the error's `msg` as the value associated with that key
        const errorObject = Object.fromEntries(errorArray.map((error) => [error.param, error.msg]));
        // Retrieve all the categories from the database for use in the product form
        const categories = await Category.find({}).select('name').lean().sort({ name: 1 }).exec();
        if(newProductImage || newDescriptionImages) errorObject.images =true;
        // If no categories are found, Redirect to error Page.
        if (!categories.length) {
          const err = new Error('No Categories Found');
          err.status = 404;
          return next(err);
        }
        // Render the product form with the original data and the errors
        res.render('productForm', {
          title: 'Update Product Details',
          name,
          description,
          SKU: sku,
          category,
          quantity,
          price,
          categories,
          productImage: oldProductImage,
          descriptionImages: oldDescriptionImages,
          errors: errorObject,
        });
        return;
      }
      // Deleting The Old Images and creating new ProductImage/DescriptionImages object to store details of the new images 
      let productImage={};
      const promises = [];
      if( newProductImage){//Case: New Image uploaded
        promises.push(unlink(oldProductImage.path));
        productImage={
          fileName: newProductImage[0].filename,
          path: newProductImage[0].path,
          mimeType: newProductImage[0].mimetype,
        };
      }else{// Case: No new Image uploaded
        productImage ={
          fileName: oldProductImage.fileName,
          path: oldProductImage.path,
          mimeType: oldProductImage.mimeType,
        };
      }
      //Case: Multiple Selected Images
      if(Array.isArray(delDescImages)){
        //Deleting the Selected Images from the server
        oldDescriptionImages.forEach((image)=>{
          if(delDescImages.includes(image._id.toString())){
            promises.push(unlink(image.path));
          }
        });
      }else if(delDescImages){ //Case: Single Selected Image
        oldDescriptionImages.forEach((image)=>{
          if(delDescImages === image._id.toString()){
            promises.push(unlink(image.path));
          }
        });
      }
      
      Promise.all(promises).catch((err) => next(err));
      //Generates a New Array of description images, removing the selected images And appending the newly uploaded ones
      let oldDescImagesTemp = [];
      if(Array.isArray(delDescImages)){
        oldDescImagesTemp = oldDescriptionImages.filter((file)=>!delDescImages.includes(file._id.toString()));
      }else if(delDescImages){
        oldDescImagesTemp = oldDescriptionImages.filter((file)=>!(delDescImages === file._id.toString()));
      }else{
        oldDescImagesTemp = [...oldDescriptionImages];
      }
      let newDescImagesFormatted = [];
      if(newDescriptionImages){
        if(!Array.isArray(newDescriptionImages)){//Case: A single New Description images have been uploaded
          newDescImagesFormatted = [{
              fileName:newDescriptionImages.filename,
              path:newDescriptionImages.path,
              mimeType:newDescriptionImages.mimetype,
            }];
        }else{//Case: Multiple Description Images have been uploaded
          newDescImagesFormatted = newDescriptionImages
            .map(({filename, path, mimetype})=>({
              fileName:filename,
              path,
              mimeType:mimetype,
            }));
        }
      }
      const descriptionImages= [...oldDescImagesTemp, ...newDescImagesFormatted];
      // If there are no validation errors, create a new product object and save it to the database
      const product = new Product({
        name,
        description,
        SKU: sku,
        category,
        quantity,
        price,
        productImage,
        descriptionImages,
        _id: req.params.id,
      });
      const updatedProduct = await Product.findByIdAndUpdate(req.params.id, product, { new: true });
      // Redirect to the updated product's details page
      res.redirect(updatedProduct.url);
    } catch (err) {
      // If an error occurs, forward it to the error handler middleware
      return next(err);
    }
  },
];
