const { MongoClient } = require("mongodb");


// test string, to be changed (ENV?)
const uri = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(uri);
// test database name
const db = client.db('our_db')

const selectStats = () => {
    const stats = db.collection('stats')
    stats.find().then((result) => {
        // examine result data to ensure this is correct
        return result
    })
}

module.exports = {selectStats}