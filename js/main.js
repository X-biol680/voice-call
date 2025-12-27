// Connect to Socket.IO server
const socket = io();

// Login function called from index.html
function login() {
  const userIdInput = document.getElementById("userIdInput");
  const userId = userIdInput.value.trim();

  if (!userId) {
    alert("Please enter a User ID");
    return;
  }

  // Save user ID locally
  localStorage.setItem("userId", userId);

  // Register user on server
  socket.emit("register-user", userId);

  // Go to room page
  window.location.href = "room.html";
}￼Enter
