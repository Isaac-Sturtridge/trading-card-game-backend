const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: [String], unique: true, required: true },
  password: { type: [String], required: true },
  email: { type: [String] },
});

const Users = mongoose.model("Users", userSchema);

module.exports = Users;
