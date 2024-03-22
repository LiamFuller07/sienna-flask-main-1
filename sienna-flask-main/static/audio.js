function startRecording(el, rec) {
    el.innerHTML = "Recording...";
    el.disabled = true;

    // Initialise connection to Deepgram
    const dgSocket = new WebSocket(
        "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true",
        ["token", "a12a55ee5b9e4bb5ed14bcbf6f8af42acfa0c63d"]
    );

    // Logging WebSocket events
    dgSocket.onopen = () => {
        // Send data to Deepgram in increments
        rec.addEventListener("dataavailable", event => {
            if (event.data.size > 0 && dgSocket.readyState == 1) {
                dgSocket.send(event.data);
            }
        });

        rec.start(150);
    }

    dgSocket.onmessage = async (msg) => {
        // Parse data sent from Deepgram
       const dgReceived = JSON.parse(msg.data);
       const dgTranscript =
            dgReceived.channel.alternatives[0].transcript;

        if (dgTranscript && dgReceived.is_final) {
            document.getElementById("conversation").innerHTML += `<br><br><span class="human">${dgTranscript}</span>`;
            window.scrollTo(0, document.body.scrollHeight);
            console.log(dgTranscript);
            rec.stop();
            dgSocket.close();

            // Send to GPT-4 & ElevenLabs
            await fetch("/reply", {method: "POST", body: dgTranscript});

            dgSocket.close();
            el.innerHTML = "Start Recording";
            el.disabled = false;
        }
    }

    dgSocket.onerror = (err) => {
        console.log({event: "onerror", err});
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const btnStart = document.getElementById("recStart");

    navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
        const mediaRecorder = new MediaRecorder(stream);

        btnStart.addEventListener("click", startRecording(btnStart, mediaRecorder));

        // Trigger recording on space press
        document.addEventListener("keyup", (e) => {
            if (e.code === "Space")
            {
                startRecording(btnStart, mediaRecorder);
            }
        });
    })
    .catch(err => console.error("Error accessing microphone:", err));
});