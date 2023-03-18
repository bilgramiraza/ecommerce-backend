const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true },
  SKU: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  quantity: { type: Number, min: 0, required: true },
  price: { type: Number, min: 0, required: true },
  productImage: {
    fileName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
  },
  descriptionImages: [
    {
      fileName: { type: String, required: true },
      path: { type: String, required: true },
      mimeType: { type: String, required: true },
    },
  ],
});

ProductSchema.virtual('url').get(function () {
  return `/inventory/product/${this._id}`;
});

module.exports = mongoose.model('Product', ProductSchema);
