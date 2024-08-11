let localStream;
let pc;

const startCall = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
        });

        pc = new RTCPeerConnection();

        localStream
            .getTracks()
            .forEach((track) => pc.addTrack(track, localStream));

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit("candidate", event.candidate);
            }
        };

        pc.ontrack = (event) => {
            const remoteAudio = new Audio();
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", offer);
    } catch (error) {
        console.error("Error accessing media devices.", error);
    }
};

socket.on("offer", async (offer) => {
    if (!pc) await startCall();

    try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
    } catch (error) {
        console.error(
            "Error setting remote description or creating answer.",
            error,
        );
    }
});

socket.on("answer", async (answer) => {
    try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error("Error setting remote description.", error);
    }
});

socket.on("candidate", async (candidate) => {
    try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error("Error adding ICE candidate.", error);
    }
});

startCall();
