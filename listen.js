const { server } = require('./app');
const { PORT = 9090 } = process.env

server.listen(PORT, () => {
	console.log(`Listening on ${PORT}`);
});