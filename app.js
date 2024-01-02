const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { gameSetup, dealFromDeck } = require('./utils/gameSetup');

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
		origin: 'http://localhost:5173',
	},
});

app.use(cors());

let cardsInDeck, cardsOnTable, player1Hand, player2Hand, users;

io.use((socket, next) => {
	const username = socket.handshake.auth.username;
	if (!username) {
		return next(new Error('invalid username'));
	}
	socket.username = username;
	// console.log(username);
	next();
});

// io.use((socket, next) => {
// 	if (io.of('/').sockets.length === undefined) {
// 		socket.username = 'player1';
// 	} else {
// 		socket.username = 'player2';
// 	}
// 	// console.log(io.of('/').sockets);
// 	next();
// });

io.on('connection', (socket) => {
	console.log(`${socket.id} has connected!`);
	users = {};
	for (let [id, socket] of io.of('/').sockets) {
		users[socket.username] = id;
	}
	// console.log(users);

	socket.on('gameStart', () => {
		console.log('gameStart:', socket.username, socket.id);
		result = gameSetup();
		// console.log(result);
		cardsInDeck = result['cardsInDeck'];
		cardsOnTable = result['cardsOnTable'];
		player1Hand = dealFromDeck(cardsInDeck, 5);
		player2Hand = dealFromDeck(cardsInDeck, 5);
		// console.log(cardsInDeck, cardsOnTable, player1Hand);]
		// console.log(io.of('/').sockets.length);
		io.emit('gameSetup', { cardsInDeck, cardsOnTable });
		socket.emit('initialPlayerHand', player1Hand);
		// console.log(users['player2'], 'player2');
		socket.broadcast.emit('initialPlayerHand', player2Hand);

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
// io.use((socket, next) => {
// 	console.log(io.of('/').sockets);
// 	next();
// });

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
