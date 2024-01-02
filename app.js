const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
	},
});

app.use(cors());

io.on('connection', (socket) => {
	console.log('user connected');
	console.log(socket.id);
	socket.on('message', () => {
		socket.emit('message', 'hey');
	});
});

module.exports = { server };
