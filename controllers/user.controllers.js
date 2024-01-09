const Users = require("../models/user.models");

const postUsers = async (req, res) => {
  try {
    const newUser = await Users.create(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = { postUsers };
