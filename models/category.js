const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true },
});

CategorySchema.virtual('url').get(() => {
  return `/inventory/category/${this._id}`;
});

module.exports = mongoose.model('Category', CategorySchema);
