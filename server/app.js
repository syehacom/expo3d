const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
require("events").EventEmitter.defaultMaxListeners = 0;

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: true,
  origins: ["*"],
  methods: ["GET", "POST"],
  credentials: true,
});

app.use(cors());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ extended: true, limit: "10mb" }));

function enemy() {
  io.emit("enemy", true);
}

(function loop() {
  let random = (Math.floor(Math.random() * 3) + 5) * 1000;
  setTimeout(() => {
    enemy();
    loop();
  }, random);
})();

io.on("connection", (socket) => {
  socket.on("FromAPI", (data) => {
    socket.broadcast.emit("FromAPI", data);
    socket.on("disconnect", () => {
      console.log("クライアント接続が切れました");
    });
  });
});

server.listen(port, () => {
  console.log(`listening on *:${port}`);
});
