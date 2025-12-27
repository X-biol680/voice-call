// Connect to Socket.IO
const socket = io();

// Get saved userId
const userId = localStorage.getItem("userId");
if (!userId) {
  window.location.href = "index.html";
}

// Register again (important after page change)
socket.emit("register-user", userId);

// UI elements
const roomTitle = document.getElementById("roomTitle");
const roomInfo = document.getElementById("roomInfo");
const bell = document.getElementById("bell");

// State
let currentRoom = null;
let localStream = null;
let peers = {}; // userId -> RTCPeerConnection

// ===== ROOM JOIN =====
function joinRoom() {
  const roomCode = document.getElementById("roomCodeInput").value.trim();
  if (!roomCode) {
    alert("Enter a room code");
    return;
  }

  currentRoom = roomCode;
  roomTitle.innerText = "Room: " + roomCode;

  socket.emit("join-room", {
    roomCode: roomCode,
    userId: userId
  });
}

// Receive current users in room
socket.on("room-users", (users) => {
  roomInfo.innerText = "Users in room: " + users.join(", ");
});

// Someone joined the room
socket.on("user-joined", (otherUserId) => {
  roomInfo.innerText = otherUserId + " joined the room";

  // If call already started, connect audio
  if (localStream) {
    createPeerConnection(otherUserId, true);
  }
});

// Someone left
socket.on("user-left", (leftUser) => {
  roomInfo.innerText = leftUser + " left the room";
  if (peers[leftUser]) {
    peers[leftUser].close();
    delete peers[leftUser];
  }
});

// ===== INVITE USER =====
function inviteUser() {
  const inviteId = document.getElementById("inviteUserInput").value.trim();
  if (!inviteId || !currentRoom) {
    alert("Enter user ID and join a room first");
    return;
  }

  socket.emit("invite-user", {
    from: userId,
    to: inviteId,
    roomCode: currentRoom
  });

  alert("Invite sent to " + inviteId);
}

// Receive invite
socket.on("invite-received", (data) => {
  const accept = confirm(
    `Invite from ${data.from} to join room "${data.roomCode}". Accept?`
  );

  if (accept) {
    document.getElementById("roomCodeInput").value = data.roomCode;
    joinRoom();
  }
});

// ===== START CALL =====
async function startCall() {
  if (!currentRoom) {
    alert("Join a room first");
    return;
  }

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });

    roomInfo.innerText = "Call started";

    // Connect to existing users
    socket.emit("join-room", {
      roomCode: currentRoom,
      userId: userId
    });

  } catch (err) {
    alert("Microphone permission denied");
    console.error(err);
  }
}

// ===== WEBRTC =====
function createPeerConnection(otherUserId, isInitiator) {
  if (peers[otherUserId]) return;

  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });

  peers[otherUserId] = pc;

  // Send ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("signal", {
        to: otherUserId,
        from: userId,
        candidate: event.candidate
      });
    }
  };

  // Play incoming audio
  pc.ontrack = (event) => {
    const audio = document.createElement("audio");
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
    document.body.appendChild(audio);
  };

  // Add microphone stream
  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  // If initiator, create offer
  if (isInitiator) {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => {
        socket.emit("signal", {
          to: otherUserId,
          from: userId,
          offer: pc.localDescription
        });
      });
  }
}

// Handle signaling
socket.on("signal", async (data) => {
  const from = data.from;
  let pc = peers[from];

  if (!pc) {
    pc = createPeerConnection(from, false);
  }

  if (data.offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("signal", {
      to: from,
      from: userId,
      answer: pc.localDescription
    });
  }

  if (data.answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  if (data.candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.error(e);
    }
  }
});Enter
