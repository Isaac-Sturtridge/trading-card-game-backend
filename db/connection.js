const mongoose = require('mongoose')

const db = async () => {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/tradingCards"
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

module.exports = db;