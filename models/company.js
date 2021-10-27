const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const company = new Schema({
  name: { type: String, required: true },
  data: [
    {
      name: String,
      address: { postalCode: String, city: String, street: String },
      siteURL: String,
      keyWords: [String],
      siteDataURL: String,
    },
  ],
  length: { type: Number, required: true },
});

module.exports = mongoose.model("Company", company);
