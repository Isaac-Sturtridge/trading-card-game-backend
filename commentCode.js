// io.use((socket, next) => {
// 	console.log(io.of('/').sockets);
// 	next();
// });

io.use((socket, next) => {
	const sessionID = socket.handshake.auth.sessionID;
	if (sessionID) {
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

	socket.sessionID = randomId();
	socket.userID = randomId();
	socket.username = username;
	next();
});

users = {};
for (let [id, socket] of io.of('/').sockets) {
	users[socket.username] = id;
}
console.log(users);

io.use((socket, next) => {
	const username = socket.handshake.auth.username;
	if (!username) {
		return next(new Error('invalid username'));
	}
	socket.username = username;
	console.log(username);
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

// socket.emit - only the sender
// socket.broadcast.emit - everyone expect the sender
// io.emit - everyone
