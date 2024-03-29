const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const {
	createCardsInDeck,
	dealFromDeck,
	createBonusPoints,
	tokenValues,
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
	// console.log(arr, id);
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
			}
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
	socket.gameRoom = room;

	socket.join(socket.gameRoom);

	const clients = io.sockets.adapter.rooms.get('hello');
	const numClients = clients ? clients.size : 0;
	if (numClients > 2) {
		next(new Error('already two players in the room'));
	}
	// console.log(clients, numClients, 'clients in room', io.engine.clientsCount);
	console.log(
		`connected: ${socket.username} (${socket.userID}) joined ${socket.gameRoom} on session ${socket.sessionID}`
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
		console.log(roomData.playerScores);
		roomData.playerScores[camelBonusPlayer] += 5;
		io.to(socket.gameRoom).emit('scoreUpdate', {
			playerScores: roomData.playerScores,
		});

		io.to(socket.gameRoom).emit('gamePlayUpdates', {
			msg: `${camelBonusPlayer} got 5 points for having the most camels in their herd.`,
		});

		console.log(
			`${camelBonusPlayer} got 5 points for having the most camels in their herd.`
		);
		console.log(roomData.playerScores);
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

		// console.log(bonusCount);

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

			// console.log(goodsCount);

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

	sessionStore.deleteSession(socket.sessionID);
	delete gameData[socket.gameRoom];
};

io.on('connection', (socket) => {
	// console.log(`${socket.id} has connected!`);
	// console.log(socket.rooms, '<--- users rooms');
	// console.log(
	// 	`connected: ${socket.username} (${socket.userID}) joined ${socket.gameRoom} on session ${socket.sessionID}`
	// );
	sessionStore.saveSession(socket.sessionID, {
		userID: socket.userID,
		username: socket.username,
		gameRoom: socket.gameRoom,
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
	// console.log(users);

	// notify existing users
	socket.broadcast.to(socket.gameRoom).emit('user connected', {
		userID: socket.userID,
		username: socket.username,
		connected: true,
		messages: [],
	});

	socket.on('gameStart', () => {
		// console.log('gameStart:', socket.username, socket.id);
		// console.log(result);
		gameData[socket.gameRoom] = { gameSetup: false, lastTurn: '' };
		const roomData = gameData[socket.gameRoom];
		roomData.cardsInDeck = createCardsInDeck();
		roomData.cardsOnTable = dealFromDeck(roomData.cardsInDeck, 5);
		roomData.bonusPoints = createBonusPoints();
		roomData.tokenValues = { ...tokenValues };
		roomData.playerHands = {};
		roomData.playerScores = {};
		roomData.playerTokens = {};
		roomData.playerBonuses = {};
		let otherUserId;
		sessionStore.findAllSessions().forEach((session) => {
			if (session.gameRoom === socket.gameRoom) {
				roomData.playerHands[session.userID] = dealFromDeck(
					roomData.cardsInDeck,
					5
				);
				roomData.playerScores[session.userID] = 0;
				roomData.playerTokens[session.userID] = [];
				roomData.playerBonuses[session.userID] = [];
				if (session.userID !== socket.userID) {
					otherUserId = session.userID;
				}
			}
		});
		socket.broadcast.to(socket.gameRoom).emit('gameSetup', {
			tokenValues: roomData.tokenValues,
			cardsOnTable: roomData.cardsOnTable,
			playerHand: roomData.playerHands[otherUserId],
			playerTurn: false,
		});
		socket.emit('gameSetup', {
			// cardsInDeck: roomData.cardsInDeck,
			tokenValues: roomData.tokenValues,
			cardsOnTable: roomData.cardsOnTable,
			playerHand: roomData.playerHands[socket.userID],
			playerTurn: true,
		});

		roomData['gameSetup'] = true;

		// camelCount2 = roomData.playerHands[otherUserId].reduce(
		// 	(obj, item) => (
		// 		(obj[item.card_type] =
		// 			obj[item.card_type] === undefined
		// 				? 0
		// 				: obj[item.card_type] + 1),
		// 		obj
		// 	),
		// 	{}
		// );
		// console.log(camelCount2);
		// console.log(roomData);
	});

	socket.on('addCardToHand', ({ cards }) => {
		// take card form table and then move to hand,
		// console.log(cards, '============');
		const roomData = gameData[socket.gameRoom];

		let deckDepleted;
		if (roomData.cardsInDeck.length < cards.length) deckDepleted = true;

		for (let card of cards) {
			indexToRemove = roomData.cardsOnTable.findIndex((element) => {
				return element.card_id === card.card_id;
			});
			const cardRemoved = roomData.cardsOnTable.splice(indexToRemove, 1);
			roomData.playerHands[socket.userID].push(...cardRemoved);
			// console.log(cardRemoved);
		}
		// console.log(roomData.cardsOnTable);
		// console.log(roomData.playerHands[socket.userID]);

		// take card from deck and move to table
		roomData.cardsOnTable.push(
			...dealFromDeck(roomData.cardsInDeck, cards.length)
		);
		// console.log(roomData.cardsOnTable);

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
			// console.log(cardRemoved);
		}
		// remove from the table and add to the hand
		for (let card of tableCards) {
			indexToRemove = roomData.cardsOnTable.findIndex((element) => {
				return element.card_id === card.card_id;
			});
			const cardRemoved = roomData.cardsOnTable.splice(indexToRemove, 1);
			roomData.playerHands[socket.userID].push(...cardRemoved);
			// console.log(cardRemoved);
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

		// console.log(handCardsSwapped, handCardsSwapped.length);
		let msg = `${socket.username} swaped`;
		let count = 0;
		for (let index in handCardsSwapped) {
			count++;
			// console.log(index, handCardsSwapped[index]);
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
			// console.log(index, tableCardsSwapped[index]);
			if (Object.keys(tableCardsSwapped).length === 1)
				msg += ` ${tableCardsSwapped[index]} ${index}`;
			else if (count === Object.keys(tableCardsSwapped).length)
				msg += ` and ${tableCardsSwapped[index]} ${index}`;
			else msg += ` ${tableCardsSwapped[index]} ${index}, `;
		}
		msg += '.';

		// console.log(msg);

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

		// console.log(roomData.playerScores);

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
		roomData.lastTurn = socket.userID;
		socket.emit('playerTurn', false);
		socket.broadcast.emit('playerTurn', true);
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
			console.log(`disconnected: ${socket.username}`);
		}
	});
});

module.exports = { server, io };
