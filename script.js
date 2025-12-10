const socket = io();
let localStream;
let peerConnection;
let roomId;

const servers = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

async function joinRoom() {
    roomId = document.getElementById("roomInput").value;

    if (!roomId) {
        alert("Enter a Room ID");
        return;
    }

    socket.emit("join-room", roomId);

    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
}

socket.on("user-joined", async () => {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", { room: roomId, candidate: event.candidate });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", { room: roomId, offer });
});

socket.on("offer", async (offer) => {
    peerConnection = new RTCPeerConnection(servers);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("ice-candidate", { room: roomId, candidate: event.candidate });
        }
    };

    peerConnection.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", { room: roomId, answer });
});

socket.on("answer", async (answer) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error("ICE Error:", error);
    }
});
