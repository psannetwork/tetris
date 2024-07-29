let localStream;
let pc;

const startCall = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
    });

    pc = new RTCPeerConnection();
    pc.addStream(localStream);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", event.candidate);
        }
    };

    pc.onaddstream = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.stream;
        remoteAudio.play();
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
};

socket.on("offer", async (offer) => {
    if (!pc) startCall();

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", async (candidate) => {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

startCall();
