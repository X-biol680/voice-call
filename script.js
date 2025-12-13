const socket = io();

const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

let pc, stream, roomId;

async function joinRoom() {
    roomId = roomInput.value;
    socket.emit("join-room", roomId);
    showRoom();
}

socket.on("room-users", users => {
    userList.innerHTML = users.map(u => `<li>${u}</li>`).join("");
});

function startCall() {
    socket.emit("start-call", roomId);
}

socket.on("incoming-call", () => {
    callBox.style.display = "block";
});

async function acceptCall() {
    socket.emit("accept-call", roomId);
    callBox.style.display = "none";
    await startWebRTC(true);
}

socket.on("call-accepted", async () => {
    await startWebRTC(false);
});

async function startWebRTC(isCaller) {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    pc = new RTCPeerConnection(config);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = e => {
        if (e.candidate)
            socket.emit("ice-candidate", { roomId, candidate: e.candidate });
    };

    pc.ontrack = e => remoteAudio.srcObject = e.streams[0];

    if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { roomId, offer });
    }
}

socket.on("offer", async offer => {
    pc = new RTCPeerConnection(config);
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = e => {
        if (e.candidate)
            socket.emit("ice-candidate", { roomId, candidate: e.candidate });
    };

    pc.ontrack = e => remoteAudio.srcObject = e.streams[0];

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", { roomId, answer });
});

socket.on("answer", ans => pc.setRemoteDescription(ans));
socket.on("ice-candidate", c => pc.addIceCandidate(c));

function endCall() {
    pc.close();
    socket.emit("end-call", roomId);
}

socket.on("call-ended", () => {
    if (pc) pc.close();
});
