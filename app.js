const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");
const {
  createCardsInDeck,
  dealFromDeck,
  createBonusPoints,
  tokenValues,
} = require("./utils/gameSetup");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
const { getStats } = require("./controllers/api.controllers");
const { getUsers, postUsers, loginUser, loggedInUser } = require("./controllers/user.controllers");
const db = require("./db/connection")

const app = express();
const server = createServer(app);
app.use(express.json())


db();

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(cors());


app.get("/stats", getStats);

app.get("/users", getUsers)

app.post("/register", postUsers);

app.post("/login", loginUser)

app.get("/logout", (req, res) => { 
    req.session.destroy(); 
    res.redirect("/users"); 
}); 

const findCardType = (arr, id) => {
  // console.log(arr, id);
  return arr.find((card) => {
    return card.card_id === id;
  }).card_type;
};

const { InMemorySessionStore } = require("./sessionStore");

const sessionStore = new InMemorySessionStore();

let cardsInDeck, cardsOnTable, player1Hand, player2Hand;
let gameData = { playerHands: {}, playerScores: {} };

io.use((socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  const room = socket.handshake.auth.room;
  if (sessionID) {
    // find existing session
    const session = sessionStore.findSession(sessionID);
    if (session) {
      console.log("session restored!");
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      socket.gameRoom = session.gameRoom;
      return next();
    }
  }
  const username = loggedInUser ? loggedInUser : socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  // create new session
  socket.sessionID = randomId();
  socket.userID = randomId();
  socket.username = username;
  socket.gameRoom = room;

  socket.join(socket.gameRoom);

  const clients = io.sockets.adapter.rooms.get("hello");
  const numClients = clients ? clients.size : 0;
  if (numClients > 2) {
    next(new Error("already two players in the room"));
  }
  // console.log(clients, numClients, 'clients in room', io.engine.clientsCount);
  next();
});

io.on("connection", (socket) => {
  console.log(`${socket.id} has connected!`);
  // console.log(socket.rooms, '<--- users rooms');
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    gameRoom: socket.gameRoom,
    connected: true,
  });

  // emit session details
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  const users = [];
  sessionStore.findAllSessions().forEach((session) => {
    users.push({
      userID: session.userID,
      username: session.username,
      connected: session.connected,
    });
  });
  io.sockets.emit("users", users);
  // console.log(users);

  // notify existing users
  socket.broadcast.emit("user connected", {
    userID: socket.userID,
    username: socket.username,
    connected: true,
    messages: [],
  });

  socket.on("gameStart", () => {
    // console.log('gameStart:', socket.username, socket.id);
    // console.log(result);
    gameData.cardsInDeck = createCardsInDeck();
    gameData.cardsOnTable = dealFromDeck(gameData.cardsInDeck, 5);
    gameData.bonusPoints = createBonusPoints();
    gameData.tokenValues = tokenValues;
    let otherUserId;
    sessionStore.findAllSessions().forEach((session) => {
      gameData.playerHands[session.userID] = dealFromDeck(
        gameData.cardsInDeck,
        5
      );
      gameData.playerScores[session.userID] = 0;
      if (session.userID !== socket.userID) {
        otherUserId = session.userID;
      }
    });
    socket.broadcast.emit("gameSetup", {
      tokenValues: gameData.tokenValues,
      cardsOnTable: gameData.cardsOnTable,
      playerHand: gameData.playerHands[otherUserId],
      playerTurn: false,
    });
    socket.emit("gameSetup", {
      // cardsInDeck: gameData.cardsInDeck,
      tokenValues: gameData.tokenValues,
      cardsOnTable: gameData.cardsOnTable,
      playerHand: gameData.playerHands[socket.userID],
      playerTurn: true,
    });
    console.log(gameData);
  });

  socket.on("addCardToHand", ({ cards }) => {
    // take card form table and then move to hand,
    console.log(cards, "============");
    for (let card of cards) {
      indexToRemove = gameData.cardsOnTable.findIndex((element) => {
        return element.card_id === card.card_id;
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
    io.sockets.emit("tableUpdate", {
      cardsOnTable: gameData.cardsOnTable,
    });
    socket.emit("playerHandUpdate", {
      playerHand: gameData.playerHands[socket.userID],
    });

    const msg = `${socket.username} took a ${findCardType(
      gameData.playerHands[socket.userID],
      cards[0].card_id
    )} from the table`;
    console.log(msg);

    io.sockets.emit("gamePlayUpdates", {
      msg,
    });
  });

  socket.on("cardSwap", ({ handCards, tableCards }) => {
    // check if the handCards and the tableCards exist in the server copy
    //remove from the hand and add to the table
    for (let card of handCards) {
      indexToRemove = gameData.playerHands[socket.userID].findIndex(
        (element) => {
          return element.card_id === card.card_id;
        }
      );
      cardRemoved = gameData.playerHands[socket.userID].splice(
        indexToRemove,
        1
      );
      gameData.cardsOnTable.push(...cardRemoved);
      // console.log(cardRemoved);
    }
    // remove from the table and add to the hand
    for (let card of tableCards) {
      indexToRemove = gameData.cardsOnTable.findIndex((element) => {
        return element.card_id === card.card_id;
      });
      cardRemoved = gameData.cardsOnTable.splice(indexToRemove, 1);
      gameData.playerHands[socket.userID].push(...cardRemoved);
      // console.log(cardRemoved);
    }

    // send the new table to both players
    io.sockets.emit("tableUpdate", {
      cardsOnTable: gameData.cardsOnTable,
    });
    // send the new hand to emitting player
    socket.emit("playerHandUpdate", {
      playerHand: gameData.playerHands[socket.userID],
    });
    const msg = `${socket.username} swaped ${handCards
      .map((element) => {
        // console.log(element);
        return findCardType(gameData.cardsOnTable, element.card_id);
      })
      .join(", ")} for ${tableCards
      .map((element) => {
        return findCardType(
          gameData.playerHands[socket.userID],
          element.card_id
        );
      })
      .join(", ")}`;

    console.log(msg);

    io.sockets.emit("gamePlayUpdates", {
      msg,
    });
  });

  socket.on("sellCardFromHand", ({ cards }) => {
    // remove card from hand
    const msg = `${socket.username} sold ${cards.length}x ${findCardType(
      gameData.playerHands[socket.userID],
      cards[0].card_id
    )} card${cards.length !== 1 ? "s" : ""}`;

    let salePoints = 0;
    for (let card of cards) {
      indexToRemove = gameData.playerHands[socket.userID].findIndex(
        (element) => {
          return element.card_id === card.card_id;
        }
      );
      if (indexToRemove !== -1) {
        CardRemoved = gameData.playerHands[socket.userID].splice(
          indexToRemove,
          1
        );
        // score update

        tokenValue = gameData.tokenValues[CardRemoved[0].card_type].pop();
        if (tokenValue) {
          salePoints += tokenValue;
        }
      } else {
        // error selling a card which is not in the hand
      }
    }

    // add salePoints
    gameData.playerScores[socket.userID] += salePoints;
    // add bonusPoints
    let saleBonusPoints = 0;
    try {
      saleBonusPoints = gameData.bonusPoints[cards.length].pop();
      gameData.playerScores[socket.userID] += saleBonusPoints;
    } catch (error) {
      // if no bonus points are left do nothing
    }

    console.log(gameData.playerScores);

    // send the new hand to player and update the scores
    socket.emit("playerHandUpdate", {
      playerHand: gameData.playerHands[socket.userID],
    });
    io.sockets.emit("scoreUpdate", {
      playerScores: gameData.playerScores,
      saleStats: {
        username: socket.username,
        userID: socket.userID,
        saleBonusPoints,
        salePoints,
      },
    });
    io.sockets.emit("tokenValuesUpdate", {
      tokenValues: gameData.tokenValues,
    });

    io.sockets.emit("gamePlayUpdates", {
      msg,
    });
  });

  socket.on("data", () => {
    socket.emit("data", gameData);
  });

  socket.on("endTurn", () => {
    socket.emit("playerTurn", false);
    socket.broadcast.emit("playerTurn", true);
    if (gameData.cardsInDeck.length === 0) {
      io.sockets.emit("gameOver", {
        playerScores: gameData.playerScores,
        msg: "Cards in deck ran out",
      });
    }
    let emptyCount = 0;
    Object.values(gameData.tokenValues).forEach((token) => {
      if (token.length === 0) {
        emptyCount++;
      }
    });
    if (emptyCount >= 3) {
      io.sockets.emit("gameOver", {
        playerScores: gameData.playerScores,
        msg: "token limit reached",
      });
    }
  });

  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit("user disconnected", socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        gameRoom: socket.rooms,
        connected: false,
      });
      console.log(socket.username, "disconnected");
    }
  });
});

module.exports = { server, io };
