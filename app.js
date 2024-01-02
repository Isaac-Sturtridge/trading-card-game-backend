const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { gameSetup, dealFromDeck } = require('./utils/gameSetup');

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: '*',
	},
});

app.use(cors());

let cardsInDeck, cardsOnTable, player1Hand;

io.use((socket, next) => {
	if (io.of('/').sockets.length === 1) {
		socket.username = 'player1';
	} else {
		socket.username = 'player2';
	}
	next();
});

io.on('connection', (socket) => {
	//   console.log("user connected");

	socket.on('gameStart', () => {
		console.log('gameStart');
		result = gameSetup();
		// console.log(result);
		cardsInDeck = result['cardsInDeck'];
		cardsOnTable = result['cardsOnTable'];
		player1Hand = dealFromDeck(cardsInDeck, 5);
		// console.log(cardsInDeck, cardsOnTable, player1Hand);
		socket.emit('gameSetup', { cardsInDeck, cardsOnTable });
		socket.emit('initialPlayerHand', player1Hand);
		// socket.to(socket.id).emit;
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

// io.use((socket, next) => {
//   const sessionID = socket.handshake.auth.sessionID;
//   if (sessionID) {
//     const session = sessionStore.findSession(sessionID);
//     if (session) {
//       socket.sessionID = sessionID;
//       socket.userID = session.userID;
//       socket.username = session.username;
//       return next();
//     }
//   }
//   const username = socket.handshake.auth.username;
//   if (!username) {
//     return next(new Error("invalid username"));
//   }

//   socket.sessionID = randomId();
//   socket.userID = randomId();
//   socket.username = username;
//   next();
// });

module.exports = { server, io };
