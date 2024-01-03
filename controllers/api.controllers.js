const {selectStats} = require('../models/api.models')

const getStats = () => {
    selectStats.then((req, res) => {
        res.status(200).send({message: "okay"})
    })
}

module.exports = {getStats};