const ioc = require('socket.io-client');
const { server, io } = require('../app');

function waitFor(socket, event) {
	return new Promise((resolve) => {
		socket.once(event, resolve);
	});
}

describe('my awesome project', () => {
	let serverSocket, clientSocket, clientSocket2;

	beforeAll((done) => {
		// const httpServer = createServer();
		// io = new Server(server);
		server.listen(() => {
			const port = server.address().port;
			clientSocket = ioc(`http://localhost:${port}`, {
				'force new connection': true,
			});
			clientSocket2 = ioc(`http://localhost:${port}`, {
				'force new connection': true,
			});
			io.on('connection', (socket) => {
				serverSocket = socket;
			});
			clientSocket.auth = { username: 'player1' };
			clientSocket2.auth = { username: 'player2' };
			clientSocket.on('session', (data) => {
				clientSocket.userID = data.userID;
			});
			clientSocket2.on('session', (data) => {
				clientSocket2.userID = data.userID;
			});
			clientSocket.on('connect', done);
			clientSocket2.on('connect', done);
			// clientSocket.on('session', (res) => {
			// 	console.log(res);
			// });
		});
	});

	afterAll(() => {
		io.close();
		clientSocket.disconnect();
		clientSocket2.disconnect();
	});

	test('gameStart return a gameSetup with deck, table and hand cards for both players', (done) => {
		clientSocket.emit('gameStart');

		let player1SetupData, player2SetupData;
		clientSocket.on('gameSetup', (setupData) => {
			player1SetupData = setupData;
			console.log('player1 got gameSetup');
			// console.log(setupData.playerHand, "<- player hand")
			expect(setupData).toMatchObject({
				cardsOnTable: expect.any(Array),
				cardsInDeck: expect.any(Array),
				playerHand: expect.any(Array),
			});
		});
		clientSocket2.on('gameSetup', (setupData) => {
			player2SetupData = setupData;
			console.log('player2 got gameSetup');
			expect(setupData).toMatchObject({
				cardsOnTable: expect.any(Array),
				cardsInDeck: expect.any(Array),
				playerHand: expect.any(Array),
			});
			done();
		});
	});

	test('addCardToHand', (done) => {
		const payload = {
			cards: [{ card_id: '75754222-025c-4046-ae89-5f69c4eef65d' }], // a gold card from the table
		};
		clientSocket2.emit('addCardToHand', payload);
		clientSocket2.on('playerHandUpdate', (data) => {
			// console.log('playerHandUpdate');
			expect(data).toMatchObject({
				playerHand: expect.any(Array),
			});
			expect(data.playerHand.length).toBe(6);
		});
		clientSocket.on('tableUpdate', (data) => {
			// console.log('tableUpdate 1');

			expect(data).toMatchObject({
				cardsOnTable: expect.any(Array),
			});
			expect(data.cardsOnTable.length).toBe(5);
		});
		clientSocket2.on('tableUpdate', (data) => {
			// console.log('tableUpdate 2');

			expect(data).toMatchObject({
				cardsOnTable: expect.any(Array),
			});
			expect(data.cardsOnTable.length).toBe(5);
			done();
		});
	});

	test('sellCardFromHand', (done) => {
		const payload = {
			cards: [{ card_id: '00222345-73e2-41a9-82c2-b91bb452acc8' }],
		};
		clientSocket.emit('sellCardFromHand', payload);
		clientSocket.on('playerHandUpdate', (data) => {
			// console.log(data)
			expect(data).toMatchObject({
				playerHand: expect.any(Array),
			});
			expect(data.playerHand.length).toBe(4);
		});
		clientSocket2.on('scoreUpdate', (data) => {
			// console.log(data, "<- score data")
			// console.log(clientSocket2.userID, "client 2 user id")
			// console.log('client socket 2 receiving scores')
			expect(data.playerScores[clientSocket2.userID]).toBe(0);
			expect(data.playerScores[clientSocket.userID]).toBe(6);
		});
		clientSocket.on('scoreUpdate', (data) => {
			// console.log('client socket 1 receiving scores')
			expect(data.playerScores[clientSocket.userID]).toBe(6);
			expect(data.playerScores[clientSocket2.userID]).toBe(0);
			done();
		});
	});

	test('endTurn', (done) => {
		clientSocket.emit('endTurn');
		clientSocket.on('playerTurn', (data) => {
			console.log('playerTurn 1');
			expect(data).toBe(false);
		});
		clientSocket2.on('playerTurn', (data) => {
			console.log('playerTurn 2');
			expect(data).toBe(true);
			done();
		});
	});

	// test("should send back and user id and session id", () => {
	//   clientSocket.on("connection", (arg) => {
	//     clientSocket.on("session", (data) => {
	//       console.log(data);
	//     });
	//     console.log(arg);
	//     done();
	//   });
	// });

	//   test("should work with an acknowledgement", (done) => {
	//     serverSocket.on("hi", (cb) => {
	//       cb("hola");
	//     });
	//     clientSocket.emit("hi", (arg) => {
	//       expect(arg).toBe("hola");
	//       done();
	//     });
	//   });

	//   test("should work with emitWithAck()", async () => {
	//     serverSocket.on("foo", (cb) => {
	//       cb("bar");
	//     });
	//     const result = await clientSocket.emitWithAck("foo");
	//     expect(result).toBe("bar");
	//   });

	//   test("should work with waitFor()", () => {
	//     clientSocket.emit("baz");

	//     return waitFor(serverSocket, "baz");
	//   });
});
