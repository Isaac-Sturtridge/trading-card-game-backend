const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
	createCardsInDeck,
	dealFromDeck,
	createBonusPoints,
	getTokens,
} = require('./utils/gameSetup');
const crypto = require('crypto');
const randomId = () => crypto.randomBytes(8).toString('hex');

const app = express();
const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: '*',
	},
});

app.use(cors());

const findCardType = (arr, id) => {
	return arr.find((card) => {
		return card.card_id === id;
	}).card_type;
};

const { InMemorySessionStore } = require('./sessionStore');
const { set } = require('mongoose');
const sessionStore = new InMemorySessionStore();

let gameData = {};

io.use((socket, next) => {
	const sessionID = socket.handshake.auth.sessionID;
	const room = socket.handshake.auth.room;
	if (sessionID) {
		// find existing session
		const session = sessionStore.findSession(sessionID);
		if (session) {
			socket.sessionID = sessionID;
			socket.userID = session.userID;
			socket.username = session.username;
			socket.gameRoom = session.gameRoom;
			console.log(
				`restored: ${socket.username} (${socket.userID}) joined ${socket.gameRoom} on session ${socket.sessionID}`
			);

			try {
				const roomData = gameData[socket.gameRoom];
				if (roomData.gameSetup) {
					const users = [];
					sessionStore.findAllSessions().forEach((session) => {
						if (session.gameRoom === socket.gameRoom)
							users.push(session);
					});

					socket.emit('resume', {
						users: users,
						room: socket.gameRoom,
						cardsInDeck: roomData.cardsInDeck.length,
						playerScores: roomData.playerScores,
						tokenValues: roomData.tokenValues,
						cardsOnTable: roomData.cardsOnTable,
						playerHand: roomData.playerHands[socket.userID],
						playerTurn:
							roomData.lastTurn === socket.userID ? false : true,
					});
					return next();
				}
			} catch {}
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
	socket.gameRoom = room;

	socket.join(socket.gameRoom);

	const clients = io.sockets.adapter.rooms.get(socket.gameRoom);
	const numClients = clients ? clients.size : 0;
	if (numClients > 2) {
		next(new Error('already two players in the room'));
	}
	console.log(
		`connected: ${socket.username}; userID: ${socket.userID}, room: ${socket.gameRoom} sessionID: ${socket.sessionID}, socketID: ${socket.id}`
	);
	next();
});

const getMax = (obj) => {
	const max = Math.max(...Object.values(obj));
	return Object.keys(obj).filter((key) => obj[key] === max);
};

const gameOver = (socket, trigger) => {
	const roomData = gameData[socket.gameRoom];

	let msg;
	if (trigger === '3TypesOfTokensExhausted')
		msg = '3 types of good tokens have been earned.';
	else msg = 'There are no cards in the deck to refill the market.';

	// check which player had the most camels in their hand

	camelCount = {};
	Object.keys(roomData.playerHands).forEach((player) => {
		camelCount[player] = roomData.playerHands[player].filter(
			(card) => card.card_type === 'Camel'
		).length;
	});

	// assign the camelBonusPlayer
	mostCamels = getMax(camelCount);
	let camelBonusPlayer;
	// if there was a camelBonus add it
	if (mostCamels.length === 1) {
		camelBonusPlayer = mostCamels[0];
		roomData.playerScores[camelBonusPlayer] += 5;
		io.to(socket.gameRoom).emit('scoreUpdate', {
			playerScores: roomData.playerScores,
		});

		io.to(socket.gameRoom).emit('gamePlayUpdates', {
			msg: `${camelBonusPlayer} got 5 points for having the most camels in their herd.`,
		});
	}

	let winner, winReason;
	// total score compare
	highestScore = getMax(roomData.playerScores);
	if (highestScore.length === 1) {
		winner = highestScore[0];
		winReason = 'Highest score';
	}
	// if tie, the player with the most bonus tokens earned
	else {
		bonusCount = {};
		Object.keys(roomData.playerBonuses).forEach((player) => {
			bonusCount[player] = roomData.playerBonuses[player].length;
		});

		mostBonus = getMax(bonusCount);
		if (mostBonus.length === 1) {
			winner = mostBonus[0];
			winReason = 'Most bonus tokens';
		}
		// if still tie, the player with the most goods tokens
		else {
			goodsCount = {};
			Object.keys(roomData.playerTokens).forEach((player) => {
				goodsCount[player] = roomData.playerTokens[player].length;
			});

			mostGoods = getMax(goodsCount);
			if (mostGoods.length === 1) {
				winner = mostGoods[0];
				winReason = 'Most goods tokens';
			}
			// call it a draw!
			else {
				winner = 'No one!';
				winReason =
					'The total points, number of bonus tokens and the number of goods tokens were equal!';
			}
		}
	}

	io.to(socket.gameRoom).emit('gameOver', {
		playerScores: roomData.playerScores,
		gameOverReason: msg,
		camelBonusPlayer: camelBonusPlayer,
		msg,
		winner,
		winReason,
	});

	sessionStore.findAllSessions().forEach((session) => {
		if (session.gameRoom === socket.gameRoom)
			sessionStore.deleteSession(session);
	});
	delete gameData[socket.gameRoom];
	io.socketsLeave(socket.gameRoom);
};

io.on('connection', (socket) => {
	sessionStore.saveSession(socket.sessionID, {
		userID: socket.userID,
		username: socket.username,
		gameRoom: socket.gameRoom,
		id: socket.id,
		connected: true,
	});

	// emit session details
	socket.emit('session', {
		sessionID: socket.sessionID,
		userID: socket.userID,
		room: socket.gameRoom,
	});

	const users = [];
	sessionStore.findAllSessions().forEach((session) => {
		if (session.gameRoom === socket.gameRoom) users.push(session);
	});
	io.to(socket.gameRoom).emit('users', users);

	// notify existing users
	socket.broadcast.to(socket.gameRoom).emit('user connected', {
		userID: socket.userID,
		username: socket.username,
		connected: true,
		messages: [],
	});

	socket.on('gameStart', () => {
		const socketIDs = Array.from(
			io.sockets.adapter.rooms.get(socket.gameRoom)
		);
		gameData[socket.gameRoom] = {
			gameSetup: false,
			lastTurn:
				Math.random() >= 0.5
					? sessionStore.findUserID(socketIDs[0])
					: sessionStore.findUserID(socketIDs[1]),
		};
		const roomData = gameData[socket.gameRoom];
		roomData.cardsInDeck = createCardsInDeck();
		roomData.cardsOnTable = dealFromDeck(roomData.cardsInDeck, 5);
		roomData.bonusPoints = createBonusPoints();
		roomData.tokenValues = getTokens();
		roomData.playerHands = {};
		roomData.playerScores = {};
		roomData.playerTokens = {};
		roomData.playerBonuses = {};

		for (let socketID of io.sockets.adapter.rooms.get(socket.gameRoom)) {
			let client = sessionStore.findUserID(socketID);
			roomData.playerHands[client] = dealFromDeck(
				roomData.cardsInDeck,
				5
			);
			roomData.playerScores[client] = 0;
			roomData.playerTokens[client] = [];
			roomData.playerBonuses[client] = [];

			io.to(socketID).emit('gameSetup', {
				tokenValues: roomData.tokenValues,
				cardsOnTable: roomData.cardsOnTable,
				playerHand: roomData.playerHands[client],
				playerTurn: roomData.lastTurn === client ? false : true,
			});
		}

		roomData['gameSetup'] = true;
	});

	socket.on('addCardToHand', ({ cards }) => {
		// take card form table and then move to hand,
		const roomData = gameData[socket.gameRoom];

		let deckDepleted;
		if (roomData.cardsInDeck.length < cards.length) deckDepleted = true;

		for (let card of cards) {
			indexToRemove = roomData.cardsOnTable.findIndex((element) => {
				return element.card_id === card.card_id;
			});
			const cardRemoved = roomData.cardsOnTable.splice(indexToRemove, 1);
			roomData.playerHands[socket.userID].push(...cardRemoved);
		}

		// take card from deck and move to table
		roomData.cardsOnTable.push(
			...dealFromDeck(roomData.cardsInDeck, cards.length)
		);

		io.to(socket.gameRoom).emit('tableUpdate', {
			cardsOnTable: roomData.cardsOnTable,
		});
		// send new hand to player
		socket.emit('playerHandUpdate', {
			playerHand: roomData.playerHands[socket.userID],
		});

		// send players hand length to other player
		socket.broadcast.to(socket.gameRoom).emit('opponentHandUpdate', {
			opponentHandUpdate: roomData.playerHands[socket.userID].length,
		});

		const msg = `${socket.username} took ${cards.length} ${findCardType(
			roomData.playerHands[socket.userID],
			cards[0].card_id
		)} from the market`;

		io.to(socket.gameRoom).emit('gamePlayUpdates', {
			msg,
		});

		if (deckDepleted) {
			gameOver(socket);
			return;
		}

		io.to(socket.gameRoom).emit('cardsInDeckUpdate', {
			cardsInDeck: roomData.cardsInDeck.length,
		});
	});

	socket.on('cardSwap', ({ handCards, tableCards }) => {
		// check if the handCards and the tableCards exist in the server copy
		//remove from the hand and add to the table
		const roomData = gameData[socket.gameRoom];

		for (let card of handCards) {
			indexToRemove = roomData.playerHands[socket.userID].findIndex(
				(element) => {
					return element.card_id === card.card_id;
				}
			);
			const cardRemoved = roomData.playerHands[socket.userID].splice(
				indexToRemove,
				1
			);
			roomData.cardsOnTable.push(...cardRemoved);
		}
		// remove from the table and add to the hand
		for (let card of tableCards) {
			indexToRemove = roomData.cardsOnTable.findIndex((element) => {
				return element.card_id === card.card_id;
			});
			const cardRemoved = roomData.cardsOnTable.splice(indexToRemove, 1);
			roomData.playerHands[socket.userID].push(...cardRemoved);
		}

		// msg creation
		const handCardsSwapped = {};
		for (let card of handCards) {
			if (handCardsSwapped[card.card_type] !== undefined)
				handCardsSwapped[card.card_type] += 1;
			else handCardsSwapped[card.card_type] = 1;
		}
		const tableCardsSwapped = {};
		for (let card of tableCards) {
			if (tableCardsSwapped[card.card_type] !== undefined)
				tableCardsSwapped[card.card_type] += 1;
			else tableCardsSwapped[card.card_type] = 1;
		}

		let msg = `${socket.username} swaped`;
		let count = 0;
		for (let index in handCardsSwapped) {
			count++;
			if (Object.keys(handCardsSwapped).length === 1)
				msg += ` ${handCardsSwapped[index]} ${index}`;
			else if (count === Object.keys(handCardsSwapped).length)
				msg += ` and ${handCardsSwapped[index]} ${index}`;
			else msg += ` ${handCardsSwapped[index]} ${index}, `;
		}
		count = 0;
		msg += ' for';
		for (let index in tableCardsSwapped) {
			count++;
			if (Object.keys(tableCardsSwapped).length === 1)
				msg += ` ${tableCardsSwapped[index]} ${index}`;
			else if (count === Object.keys(tableCardsSwapped).length)
				msg += ` and ${tableCardsSwapped[index]} ${index}`;
			else msg += ` ${tableCardsSwapped[index]} ${index}, `;
		}
		msg += '.';

		io.to(socket.gameRoom).emit('gamePlayUpdates', {
			msg,
		});
		// send the new table to both players
		io.to(socket.gameRoom).emit('tableUpdate', {
			cardsOnTable: roomData.cardsOnTable,
		});
		// send the new hand to emitting player
		socket.emit('playerHandUpdate', {
			playerHand: roomData.playerHands[socket.userID],
		});
	});

	socket.on('sellCardFromHand', ({ cards }) => {
		// remove card from hand
		const roomData = gameData[socket.gameRoom];

		preSaleHand = [...roomData.playerHands[socket.userID]];

		let salePoints = 0;
		for (let card of cards) {
			indexToRemove = roomData.playerHands[socket.userID].findIndex(
				(element) => {
					return element.card_id === card.card_id;
				}
			);
			if (indexToRemove !== -1) {
				const CardRemoved = roomData.playerHands[socket.userID].splice(
					indexToRemove,
					1
				);
				// score update

				const tokenValue =
					roomData.tokenValues[CardRemoved[0].card_type].pop();
				if (tokenValue) {
					salePoints += tokenValue;
					roomData.playerTokens[socket.userID].push(tokenValue);
				}
			} else {
				// error selling a card which is not in the hand
			}
		}

		// add salePoints
		roomData.playerScores[socket.userID] += salePoints;
		// add bonusPoints
		let saleBonusPoints = 0;
		try {
			saleBonusPoints = roomData.bonusPoints[cards.length].pop();
			roomData.playerScores[socket.userID] += saleBonusPoints;
			roomData.playerBonuses[socket.userID].push(saleBonusPoints);
		} catch (error) {
			// if no bonus points are left do nothing
		}

		// create msg for gamePlayUpdates
		const cardTypeSold = findCardType(preSaleHand, cards[0].card_id);
		let msg = `${socket.username} sold ${cards.length}x ${cardTypeSold} for ${salePoints} points`;

		if (saleBonusPoints !== 0) {
			msg += ` and got ${saleBonusPoints} bonus points.`;
		} else msg += '.';

		// msg += `. Total sale points: ${salePoints + saleBonusPoints}`;

		io.to(socket.gameRoom).emit('gamePlayUpdates', {
			msg,
		});

		// send gamePlayUpdates
		socket.emit('playerHandUpdate', {
			playerHand: roomData.playerHands[socket.userID],
		});

		// send players hand length to other player
		socket.broadcast.to(socket.gameRoom).emit('opponentHandUpdate', {
			opponentHandUpdate: roomData.playerHands[socket.userID].length,
		});

		io.to(socket.gameRoom).emit('scoreUpdate', {
			playerScores: roomData.playerScores,
			saleStats: {
				username: socket.username,
				userID: socket.userID,
				saleBonusPoints,
				salePoints,
			},
		});
		io.to(socket.gameRoom).emit('tokenValuesUpdate', {
			tokenValues: roomData.tokenValues,
		});

		// check if three or more token types have been depleted
		let emptyCount = 0;
		Object.values(roomData.tokenValues).forEach((token) => {
			if (token.length === 0) {
				emptyCount++;
			}
		});
		if (emptyCount >= 3) {
			gameOver(socket, '3TypesOfTokensExhausted');
		}
	});

	socket.on('data', () => {
		socket.emit('data', gameData[socket.gameRoom]);
	});

	socket.on('endTurn', () => {
		const roomData = gameData[socket.gameRoom];
		if (roomData !== undefined) {
			roomData.lastTurn = socket.userID;
			socket.emit('playerTurn', false);
			socket.broadcast.emit('playerTurn', true);
		}
	});

	socket.on('disconnect', async () => {
		const matchingSockets = await io.in(socket.userID).allSockets();
		const isDisconnected = matchingSockets.size === 0;
		if (isDisconnected) {
			// notify other users
			socket.broadcast
				.to(socket.gameRoom)
				.emit('user disconnected', socket.userID);
			// update the connection status of the session
			sessionStore.saveSession(socket.sessionID, {
				userID: socket.userID,
				username: socket.username,
				gameRoom: socket.gameRoom,
				connected: false,
			});
		}
	});
});

module.exports = { server, io };
