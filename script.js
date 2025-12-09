const socket = io();

let localStream;
let peerConnection;
let roomID;

const joinBtn = document.getElementById("joinBtn");
const callBtn = document.getElementById("callBtn");
const roomInput = document.getElementById("room");

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

joinBtn.onclick = async () => {
  roomID = roomInput.value;
  if (!roomID) return alert("Enter room ID");

  socket.emit("join", roomID);
  joinBtn.disabled = true;
  callBtn.disabled = false;
};

callBtn.onclick = async () => {
  await startCall();
};

async function startCall() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        room: roomID,
        candidate: event.candidate
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { room: roomID, offer });
}

socket.on("new-user", async () => {
  console.log("Someone joined the room.");
});

socket.on("offer", async (offer) => {
  peerConnection = new RTCPeerConnection(config);

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", {
        room: roomID,
        candidate: event.candidate
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.play();
  };

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { room: roomID, answer });
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
});

socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    console.error(err);
  }
});