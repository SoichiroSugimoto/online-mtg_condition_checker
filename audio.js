async function setupAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.fftSize = 2048;
    return analyser;
}

function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
}

function drawGraph(analyser) {
    const canvas = document.getElementById('audioCanvas');
    const ctx = setupCanvas(canvas);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const dataHistory = [];
    const maxHistorySize = 10 * 60;

    function draw() {
        requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        dataHistory.push([...dataArray]);
        if (dataHistory.length * 2 > maxHistorySize) {
            dataHistory.shift();
        }
        let x = 0;
        const sliceWidth = canvas.width / maxHistorySize;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgb(41, 42, 47)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let currentStrokeStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();

        dataHistory.forEach((frameData, frameIndex) => {
            let sum = frameData.reduce((a, b) => a + b, 0);
            let average = sum / bufferLength;
            let y = (canvas.height / 2) * (1 - average / 300.0);

            if (currentStrokeStyle !== 'rgb(141, 251, 125)') {
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
                currentStrokeStyle = 'rgb(141, 251, 125)';
                ctx.strokeStyle = currentStrokeStyle;
            }
            ctx.lineTo(x, y);
            ctx.stroke();
            x += sliceWidth;
        });
        ctx.stroke();
        var rect = canvas.getBoundingClientRect();
        drawHorizontalLine(ctx, (canvas.height / 2) * 1 / 10, 0.5, 'rgb(245, 251, 255)', '90')
        drawHorizontalLine(ctx, (canvas.height / 2) * 3 / 10, 0.5, 'rgb(245, 251, 255)', '70')
        drawHorizontalLine(ctx, (canvas.height / 2) * 5 / 10, 2, 'rgb(255, 123, 132)', '50')
        drawHorizontalLine(ctx, (canvas.height / 2) * 7 / 10, 0.5, 'rgb(245, 251, 255)', '30')
        drawHorizontalLine(ctx, (canvas.height / 2) * 9 / 10, 0.5, 'rgb(245, 251, 255)', '10')
        drawBorder(ctx, canvas.width, canvas.height);
    }
    draw();
}

function drawBorder(ctx, width, height) {
    ctx.strokeStyle = 'rgb(41, 42, 47)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width / 2, 150);
    ctx.lineWidth = 1;
}

function drawHorizontalLine(ctx, y, lineWidth, strokeStyle, label) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = '6px Arial';
    ctx.fillText(label, ctx.canvas.width * 1 / 100, y - 1);
}

setupAudio().then(drawGraph);
