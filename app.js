const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createCardsInDeck, dealFromDeck } = require('./utils/gameSetup');

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
	},
});

app.use(cors());

let cardsInDeck, cardsOnTable, player1Hand, player2Hand;

io.on('connection', (socket) => {
	console.log(`${socket.id} has connected!`);

	socket.on('gameStart', () => {
		console.log('gameStart:', socket.username, socket.id);
		// console.log(result);
		cardsInDeck = createCardsInDeck();
		cardsOnTable = dealFromDeck(cardsInDeck, 5);
		player1Hand = dealFromDeck(cardsInDeck, 5);
		player2Hand = dealFromDeck(cardsInDeck, 5);
		// console.log(cardsInDeck, cardsOnTable, player1Hand);]
		// console.log(io.of('/').sockets.length);
		socket.emit('gameSetup', {
			cardsInDeck,
			cardsOnTable,
			playerHand: player1Hand,
		});
		socket.broadcast.emit('gameSetup', {
			cardsInDeck,
			cardsOnTable,
			playerHand: player2Hand,
		});
		// console.log(cardsInDeck.length);
	});

	socket.emit('validating-connection', 'Connected');

	socket.emit('session', {
		sessionID: socket.sessionID,
		userID: socket.userID,
	});

	//   console.log(socket.id);
	socket.on('message', (data) => {
		console.log(data);
		socket.emit('message', 'hey');
	});
});

module.exports = { server, io };
