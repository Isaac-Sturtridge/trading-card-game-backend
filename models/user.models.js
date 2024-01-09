const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: String,
  password: { type: String },
  email: { type: String },
});

const Users = mongoose.model("Users", userSchema);

module.exports = Users;
