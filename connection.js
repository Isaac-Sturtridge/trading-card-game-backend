const ENV = process.env.NODE_ENV || 'development';

module.exports = new Pool(ENV)