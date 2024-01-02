const { createServer } = require("node:http");
const { Server } = require("socket.io");
const ioc = require("socket.io-client");
const { server, io } = require("../app");

function waitFor(socket, event) {
  return new Promise((resolve) => {
    socket.once(event, resolve);
  });
}

describe("my awesome project", () => {
  let serverSocket, clientSocket;

  beforeAll((done) => {
    // const httpServer = createServer();
    // io = new Server(server);
    server.listen(() => {
      const port = server.address().port;
      clientSocket = ioc(`http://localhost:${port}`);
      io.on("connection", (socket) => {
        serverSocket = socket;
      });
      clientSocket.on("connect", done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.disconnect();
  });

  test("should work", (done) => {
    clientSocket.on("message", (arg) => {
      expect(arg).toBe("hey");
      done();
    });
    clientSocket.emit("message", "hey");
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
