const Users = require("../models/user.models");
const bcrypt = require("bcrypt"); 
const saltRounds = 10;

const getUsers = async (req, res) => {
  try {
    const allUsers = await Users.find()
    res.status(200).send(allUsers)
  } catch (err) {
    res.status(500).json(err);
  }
}

const postUsers = async (req, res) => {
  const {name, password, email} = req.body
  const hash = bcrypt.hashSync(password, saltRounds);
  try {
    const newUser = await Users.create({name: name, password: hash, email: email});
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json(err);
  }
};

const loginUser = async (req, res) => {
  const {name, password} = req.body
  console.log(req.body)
  const user = await Users.findOne({ name }); 
  console.log(user)
  if (!user) { 
    console.log("incorrect username")
    return "Incorrect username"; 
} 
const passwordsMatch = await bcrypt.compare( 
  password, 
  user.password 
);
if(passwordsMatch) {
  // set our auth username to be the player's username
  const loggedInUser = name
  return res.redirect("/users")
} else {
  console.log("incorrect password")
  // reject and return 
  return res.redirect("/stats")
}
}

module.exports = { getUsers, postUsers, loginUser};
