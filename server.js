const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: {
    origin: "*"
  }
});

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// Default route → serve index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// WebRTC signaling handlers
io.on("connection", socket => {
  console.log("A user connected");

  socket.on("offer", data => {
    socket.broadcast.emit("offer", data);
  });

  socket.on("answer", data => {
    socket.broadcast.emit("answer", data);
  });

  socket.on("ice-candidate", data => {
    socket.broadcast.emit("ice-candidate", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
