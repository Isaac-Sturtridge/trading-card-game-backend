const io = require('socket.io-client');
const { server } = require('../app');

const testingPort = 3010;
const socketUrl = `http://localhost:${testingPort}`;

let ioServer;
let sockets;
beforeEach(() => {
	sockets = [];
	// ioServer = createServer((port = socketUrl));
	ioServer = server.listen(testingPort);
});
afterEach(() => {
	sockets.forEach((e) => e.disconnect());
	ioServer.close();
});

const makeSocket = (id = 0) => {
	const socket = io.connect(socketUrl, {
		'reconnection delay': 0,
		'reopen delay': 0,
		'force new connection': true,
		transports: ['websocket'],
	});
	socket.on('connect', () => {
		// console.log(`[client ${id}] connected`);
	});
	socket.on('disconnect', () => {
		// console.log(`[client ${id}] disconnected`);
	});
	sockets.push(socket);
	return socket;
};

describe('server', function () {
	it('should echo a message to a client', (done) => {
		const socket = makeSocket();
		socket.emit('message', 'hello world');
		socket.on('message', (msg) => {
			expect(msg).toBe('hey');
			done();
		});
	});
});
