const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createCardsInDeck, dealFromDeck } = require('./utils/gameSetup');
const {getStats} = require('./controllers/api.controllers')
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: 'http://localhost:5173',
	},
});

app.use(cors());

app.get('/stats', getStats)

const { InMemorySessionStore } = require('./sessionStore');
const sessionStore = new InMemorySessionStore();

let cardsInDeck, cardsOnTable, player1Hand, player2Hand;
let gameData = { playerHands: {} };

io.use((socket, next) => {
	const sessionID = socket.handshake.auth.sessionID;
	if (sessionID) {
		// find existing session
		const session = sessionStore.findSession(sessionID);
		if (session) {
			socket.sessionID = sessionID;
			socket.userID = session.userID;
			socket.username = session.username;
			return next();
		}
	}
	const username = socket.handshake.auth.username;
	if (!username) {
		return next(new Error('invalid username'));
	}
	// create new session
	socket.sessionID = randomId();
	socket.userID = randomId();
	socket.username = username;
	next();
});

io.on('connection', (socket) => {
	sessionStore.saveSession(socket.sessionID, {
		userID: socket.userID,
		username: socket.username,
		connected: true,
	});

	// emit session details
	socket.emit('session', {
		sessionID: socket.sessionID,
		userID: socket.userID,
	});

	socket.join(socket.userID);

	console.log(`${socket.id} has connected!`);
	const users = [];
	sessionStore.findAllSessions().forEach((session) => {
		users.push({
			userID: session.userID,
			username: session.username,
			connected: session.connected,
		});
	});
	socket.emit('users', users);
	// console.log(users);

	// notify existing users
	socket.broadcast.emit('user connected', {
		userID: socket.userID,
		username: socket.username,
		connected: true,
		messages: [],
	});

	socket.on('gameStart', () => {
		// console.log('gameStart:', socket.username, socket.id);
		// console.log(result);
		gameData.cardsInDeck = createCardsInDeck();
		gameData.cardsOnTable = dealFromDeck(gameData.cardsInDeck, 5);
		sessionStore.findAllSessions().forEach((session) => {
			gameData.playerHands[session.userID] = dealFromDeck(
				gameData.cardsInDeck,
				5
			);

			socket.to(session.userID).emit('gameSetup', {
				cardsInDeck: gameData.cardsInDeck,
				cardsOnTable: gameData.cardsOnTable,
				playerHand: gameData.playerHands[session.userID],
			});
		});
		socket.emit('gameSetup', {
			cardsInDeck: gameData.cardsInDeck,
			cardsOnTable: gameData.cardsOnTable,
			playerHand: gameData.playerHands[socket.userID],
		});
		// console.log(gameData);
	});

	socket.on('addCardToHand', ({ cards }) => {
		// take card form table and then move to hand,
		for (let card of cards) {
			indexToRemove = gameData.cardsOnTable.findIndex((element) => {
				return element.card_type === card.card_type;
			});
			cardRemoved = gameData.cardsOnTable.splice(indexToRemove, 1);
			gameData.playerHands[socket.userID].push(...cardRemoved);
			// console.log(cardRemoved);
		}
		// console.log(gameData.cardsOnTable);
		// console.log(gameData.playerHands[socket.userID]);

		// take card from deck and move to table
		gameData.cardsOnTable.push(
			...dealFromDeck(gameData.cardsInDeck, cards.length)
		);
		// console.log(gameData.cardsOnTable);

		// send new hand to player
		io.sockets.emit('tableUpdate', {
			cardsOnTable: gameData.cardsOnTable,
		});
		socket.emit('playerHandUpdate', {
			playerHand: gameData.playerHands[socket.userID],
		});
	});

	socket.on('endTurn', () => {
		socket.emit('playerTurn', false);
		socket.broadcast.emit('playerTurn', true);
	});
	socket.on('disconnect', async () => {
		const matchingSockets = await io.in(socket.userID).allSockets();
		const isDisconnected = matchingSockets.size === 0;
		if (isDisconnected) {
			// notify other users
			socket.broadcast.emit('user disconnected', socket.userID);
			// update the connection status of the session
			sessionStore.saveSession(socket.sessionID, {
				userID: socket.userID,
				username: socket.username,
				connected: false,
			});
			console.log(socket.username, 'disconnected');
		}
	});
});

module.exports = { server, io };
