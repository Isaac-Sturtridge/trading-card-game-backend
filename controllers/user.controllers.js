const Users = require("../models/user.models");

const getUsers = async (req, res) => {
  try {
    const allUsers = await Users.find()
    res.status(200).send(allUsers)
  } catch (err) {
    res.status(500).json(err);
  }
}

const postUsers = async (req, res) => {
  await console.log(req.body)
  try {
    const newUser = await Users.create(req.body);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json(err);
  }
};

module.exports = { getUsers, postUsers };
