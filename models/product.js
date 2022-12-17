const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true },
  SKU: { type: String, required: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  quantity: { type: Number, required: true },
  images: { type: String, required: true },
  price: { type: Number, required: true },
});

ProductSchema.virtual('url').get(() => {
  return `/inventory/product/${this._id}`;
});

module.exports = mongoose.model('Product', ProductSchema);
