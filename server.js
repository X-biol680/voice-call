const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve frontend files
app.use(express.static("public"));

// userId -> socketId
let users = {};

// roomCode -> [userId, userId]
let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register user
  socket.on("register-user", (userId) => {
    users[userId] = socket.id;
    socket.userId = userId;
    console.log("Registered:", userId);
  });

  // Join room
  socket.on("join-room", ({ roomCode, userId }) => {
    socket.join(roomCode);

    if (!rooms[roomCode]) {
      rooms[roomCode] = [];
    }

    if (!rooms[roomCode].includes(userId)) {
      rooms[roomCode].push(userId);
    }

    // Notify others in room
    socket.to(roomCode).emit("user-joined", userId);

    // Send current users to new user
    socket.emit("room-users", rooms[roomCode]);

    console.log(`${userId} joined room ${roomCode}`);
  });

  // Invite user
  socket.on("invite-user", ({ from, to, roomCode }) => {
    if (users[to]) {
      io.to(users[to]).emit("invite-received", {
        from,
        roomCode
      });
    }
  });

  // WebRTC signaling (offer / answer / ICE)
  socket.on("signal", (data) => {
    const targetSocket = users[data.to];
    if (targetSocket) {
      io.to(targetSocket).emit("signal", data);
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    const userId = socket.userId;

    if (userId) {
      delete users[userId];

      for (let room in rooms) {
        rooms[room] = rooms[room].filter(u => u !== userId);
        socket.to(room).emit("user-left", userId);
      }

      console.log("Disconnected:", userId);
    }
  });
});

// IMPORTANT for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});