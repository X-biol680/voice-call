// CONNECT TO RENDER BACKEND
const socket = io("https://voice-call-2.onrender.com");

// ---------------------------
// 1. WebRTC ICE Configuration
// ---------------------------
const configuration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

let localStream;
let peerConnection;
let roomId;

// ---------------------------
// 2. Start Call
// ---------------------------
document.getElementById("startCall").onclick = async () => {
    roomId = document.getElementById("roomInput").value.trim();
    if (!roomId) {
        alert("Enter a room ID!");
        return;
    }

    socket.emit("join-room", roomId);   // <--- IMPORTANT
    await startCall(roomId);
};

// ---------------------------
// 3. Join Room
// ---------------------------
document.getElementById("joinRoom").onclick = async () => {
    roomId = document.getElementById("roomInput").value.trim();
    if (!roomId) {
        alert("Enter a room ID!");
        return;
    }

    socket.emit("join-room", roomId);   // <--- IMPORTANT
    await joinCall(roomId);
};

// ---------------------------
// Start Call (Create Offer)
// ---------------------------
async function startCall(room) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", { room: room, candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        document.getElementById("remoteAudio").srcObject = event.streams[0];
    };

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", { room: room, offer: offer });

    console.log("Offer sent");
}

// ---------------------------
// Join Call (Wait for Offer)
// ---------------------------
async function joinCall(room) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", { room: room, candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        document.getElementById("remoteAudio").srcObject = event.streams[0];
    };
}

// ---------------------------
// Socket Listeners
// ---------------------------

// Receive offer
socket.on("offer", async (data) => {
    console.log("Offer received");

    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", { room: roomId, answer: answer });

    console.log("Answer sent");
});

// Receive answer
socket.on("answer", async (data) => {
    console.log("Answer received");

    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// Receive ICE candidate
socket.on("ice-candidate", async (data) => {
    if (data.candidate && peerConnection) {
        try {
            await peerConnection.addIceCandidate(data.candidate);
        } catch (e) {
            console.error("Error adding ICE candidate", e);
        }
    }
});
