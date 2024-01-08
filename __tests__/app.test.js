const ioc = require('socket.io-client');
const { server, io } = require('../app');

function waitFor(socket, event) {
	return new Promise((resolve) => {
		socket.once(event, resolve);
	});
}
let serverSocket, p1Socket, p2Socket;

beforeAll((done) => {
	server.listen(() => {
		const port = server.address().port;
		p1Socket = ioc(`http://localhost:${port}`, {
			'force new connection': true,
		});
		p2Socket = ioc(`http://localhost:${port}`, {
			'force new connection': true,
		});
		io.on('connection', (socket) => {
			serverSocket = socket;
		});
		p1Socket.auth = { username: 'player1' };
		p2Socket.auth = { username: 'player2' };
		p1Socket.on('session', (data) => {
			p1Socket.userID = data.userID;
		});
		p2Socket.on('session', (data) => {
			p2Socket.userID = data.userID;
		});
		p1Socket.on('connect', done);
		p2Socket.on('connect', done);
		// clientSocket.on('session', (res) => {
		// 	console.log(res);
		// });
	});
});

afterAll(async () => {
	p1Socket.emit('data');
	d = await waitFor(p1Socket, 'data');
	console.log(d);

	io.close();
	p1Socket.disconnect();
	p2Socket.disconnect();
});

test('gameStart return a gameSetup with deck, table and hand cards for both players', async () => {
	console.log('gameStart setup');
	p1Socket.emit('gameStart');

	waitSockets = [
		waitFor(p1Socket, 'gameSetup'),
		waitFor(p2Socket, 'gameSetup'),
	];

	const [p1GameSetupData, p2GameSetupData] = await Promise.all(waitSockets);

	expect(p1GameSetupData).toMatchObject({
		cardsOnTable: expect.any(Array),
		playerHand: expect.any(Array),
		playerTurn: true,
	});

	expect(p2GameSetupData).toMatchObject({
		cardsOnTable: expect.any(Array),
		playerHand: expect.any(Array),
		playerTurn: false,
	});
});

test('addCardToHand', async () => {
	console.log('addCardToHand');
	const payload = {
		cards: [
			{
				card_type: 'Gold',
				card_id: '75754222-025c-4046-ae89-5f69c4eef65d',
			},
		], // a gold card from the table
	};
	p2Socket.emit('addCardToHand', payload);

	waitSockets = [
		waitFor(p1Socket, 'tableUpdate'),
		waitFor(p2Socket, 'tableUpdate'),
		waitFor(p2Socket, 'playerHandUpdate'),
	];

	const [tableUpdate, tableUpdate2, player2HandUpdate] = await Promise.all(
		waitSockets
	);

	expect(tableUpdate).toEqual(tableUpdate2);
	expect(tableUpdate).toMatchObject({
		cardsOnTable: expect.any(Array),
	});
	expect(tableUpdate.cardsOnTable.length).toBe(5);

	expect(player2HandUpdate).toMatchObject({
		playerHand: expect.any(Array),
	});
	expect(player2HandUpdate.playerHand.length).toBe(6);
});

test('sellCardFromHand', async () => {
	console.log('sellCardFromHand test');
	const payload = {
		cards: [
			{
				card_type: 'Bronze',
				card_id: '00222345-73e2-41a9-82c2-b91bb452acc8',
			},
		],
	}; // the first Bronze card to be sold is worth 4 points
	p1Socket.emit('sellCardFromHand', payload);

	waitSockets = [
		waitFor(p1Socket, 'playerHandUpdate'),
		waitFor(p1Socket, 'scoreUpdate'),
		waitFor(p2Socket, 'scoreUpdate'),
	];

	const [p1HandUpdate, p1ScoreUpdate, p2ScoreUpdate] = await Promise.all(
		waitSockets
	);

	expect(p1HandUpdate).toMatchObject({
		playerHand: expect.any(Array),
	});
	expect(p1HandUpdate.playerHand.length).toBe(4);
	expect(p1ScoreUpdate).toEqual(p2ScoreUpdate);
	expect(p1ScoreUpdate.playerScores[p2Socket.userID]).toBe(0);
	expect(p1ScoreUpdate.playerScores[p1Socket.userID]).toBe(4);
});

test('cardSwap', async () => {
	console.log('cardSwap test');
	const payload = {
		handCards: [
			{
				card_type: 'Bronze',
				card_id: '4ca70a85-44d1-4605-a0d8-7284ee2e3331',
			},
			{
				card_type: 'Bronze',
				card_id: 'eac22667-3b53-4b4d-8b7f-6d7526b2a069',
			},
			{
				card_type: 'Bronze',
				card_id: '06a7b16f-ad8c-4ac8-9083-5d3d9a0a40c2',
			},
		],
		tableCards: [
			{
				card_type: 'Silver',
				card_id: 'f7666612-1624-4c65-afc1-db260b8aa13b',
			},

			{
				card_type: 'Silver',
				card_id: 'b22ebfc1-4aa3-48e2-8b46-6c874d49219f',
			},

			{
				card_type: 'Silver',
				card_id: 'a4002ebd-4594-4b32-a241-c7e553cd63c5',
			},
		],
	};

	p1Socket.emit('cardSwap', payload);

	waitSockets = [
		waitFor(p1Socket, 'playerHandUpdate'),
		waitFor(p1Socket, 'tableUpdate'),
		waitFor(p2Socket, 'tableUpdate'),
	];

	const [p1HandUpdate, p1TableUpdate, p2TableUpdate] = await Promise.all(
		waitSockets
	);

	expect(p1HandUpdate).toMatchObject({
		playerHand: expect.any(Array),
	});
	expect(p1HandUpdate.playerHand.length).toBe(4);

	expect(p1TableUpdate).toEqual(p2TableUpdate);
	expect(p1TableUpdate).toMatchObject({
		cardsOnTable: expect.any(Array),
	});
	expect(p1TableUpdate.cardsOnTable.length).toBe(5);
});

test('bonusPoints test', async () => {
	console.log('bonusPoints test');
	const payload = {
		cards: [
			{
				card_type: 'Silver',
				card_id: 'f7666612-1624-4c65-afc1-db260b8aa13b',
			},
			{
				card_type: 'Silver',
				card_id: 'b22ebfc1-4aa3-48e2-8b46-6c874d49219f',
			},
			{
				card_type: 'Silver',
				card_id: 'a4002ebd-4594-4b32-a241-c7e553cd63c5',
			},
		],
	};
	p1Socket.emit('sellCardFromHand', payload);

	waitSockets = [
		waitFor(p1Socket, 'playerHandUpdate'),
		waitFor(p1Socket, 'scoreUpdate'),
		waitFor(p2Socket, 'scoreUpdate'),
	];

	const [p1HandUpdate, p1scoreUpdate, p2scoreUpdate] = await Promise.all(
		waitSockets
	);

	// console.log(p1HandUpdate, p1scoreUpdate, p2scoreUpdate);

	expect(p1HandUpdate).toMatchObject({
		playerHand: expect.any(Array),
	});
	expect(p1HandUpdate.playerHand.length).toBe(1);

	expect(p1scoreUpdate).toEqual(p2scoreUpdate);
	expect(p1scoreUpdate.playerScores[p1Socket.userID]).toBe(20);
	expect(p1scoreUpdate.playerScores[p2Socket.userID]).toBe(0);

	// console.log(p1scoreUpdate);
});



test('endTurn', async () => {
	console.log('endTurn test');
	p1Socket.emit('endTurn');

	waitSockets = [
		waitFor(p1Socket, 'playerTurn'),
		waitFor(p2Socket, 'playerTurn'),
	];

	const [p1Turn, p2Turn] = await Promise.all(waitSockets);

	expect(p1Turn).toBe(false);
	expect(p2Turn).toBe(true);
});

