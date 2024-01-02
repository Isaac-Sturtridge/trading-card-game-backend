const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());

io.on("connection", (socket) => {
  //   console.log("user connected");

  socket.on("gameStart", () => {
    socket.emit("gameSetup");
  });

  socket.emit("validating-connection", "Connected");

  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  //   console.log(socket.id);
  socket.on("message", (data) => {
    console.log(data);
    socket.emit("message", "hey");
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
