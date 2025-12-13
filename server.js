const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);

        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push(socket.id);

        io.to(roomId).emit("room-users", rooms[roomId]);
    });

    socket.on("start-call", (roomId) => {
        socket.to(roomId).emit("incoming-call");
    });

    socket.on("accept-call", (roomId) => {
        socket.to(roomId).emit("call-accepted");
    });

    socket.on("end-call", (roomId) => {
        socket.to(roomId).emit("call-ended");
    });

    socket.on("offer", ({ roomId, offer }) => {
        socket.to(roomId).emit("offer", offer);
    });

    socket.on("answer", ({ roomId, answer }) => {
        socket.to(roomId).emit("answer", answer);
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
        socket.to(roomId).emit("ice-candidate", candidate);
    });

    socket.on("disconnect", () => {
        for (const room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
            io.to(room).emit("room-users", rooms[room]);
        }
    });
});

server.listen(process.env.PORT || 3000, () =>
    console.log("Server running")
);
