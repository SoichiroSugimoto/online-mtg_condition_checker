const video = document.getElementById("video");
const videoContainer = document.getElementById("video-container");
const MODEL_URI = "./models";
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
  faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
  faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
  faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI),
  faceapi.nets.ageGenderNet.loadFromUri(MODEL_URI),
])
  .then(playVideo)
  .catch((err) => {
    console.log(err);
  });

function playVideo() {
  if (!navigator.mediaDevices) {
    console.error("mediaDevices not supported");
    return;
  }
  navigator.mediaDevices
    .getUserMedia({
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 360, ideal: 720, max: 1080 },
      },
      audio: false,
    })
    .then(function (stream) {
      video.srcObject = stream;
    })
    .catch(function (err) {
      console.log(err);
    });
}
video.addEventListener("play", () => {
  // Creating the canvas
  const canvas = faceapi.createCanvasFromMedia(video);

  // This will force the use of a software (instead of hardware accelerated)
  // Enable only for low configurations
  canvas.willReadFrequently = true;
  videoContainer.appendChild(canvas);

  // Resizing the canvas to cover the video element
  const canvasSize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, canvasSize);
  startAudioProcessing();
  calculateBrightness();

  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();

    // Set detections size to the canvas size
    const DetectionsArray = faceapi.resizeResults(detections, canvasSize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    detectionsDraw(canvas, DetectionsArray);
    position = DetectionsArray[0]["landmarks"]["_positions"];
    expressions = DetectionsArray[0]["expressions"];
    document.getElementById('position_x').innerText = position[27]["_x"];
    document.getElementById('position_y').innerText = position[27]["_y"];
    document.getElementById('expressions').innerText = JSON.stringify(expressions);
  }, 1000);
});

// Drawing our detections above the video
function detectionsDraw(canvas, DetectionsArray) {
  // Addjust the size of the detection canvas
  faceapi.draw.drawDetections(canvas, DetectionsArray);
  faceapi.draw.drawFaceLandmarks(canvas, DetectionsArray);
  faceapi.draw.drawFaceExpressions(canvas, DetectionsArray);

  // Drawing AGE and GENDER
  DetectionsArray.forEach((detection) => {
    const box = detection.detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, {
      label: `${Math.round(detection.age)}y, ${detection.gender}`,
    });
    drawBox.draw(canvas);
  });
}

// 音声取得と音量計測の関数
function startAudioProcessing() {
  let maxVolume = 0;  // 最大音量を追跡する変数

  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const getVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        let average = sum / bufferLength;

        // 新しい平均音量が現在の最大値を上回る場合のみ表示を更新
        if (average > maxVolume) {
          maxVolume = average;
          document.getElementById('volume').innerText = average.toFixed(2);
        }

        requestAnimationFrame(getVolume);
      };

      getVolume();
    })
    .catch(err => {
      console.error('音声取得に失敗しました: ', err);
    });
}

function calculateBrightness() {
  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  canvas.width = video.width;
  canvas.height = video.height;
  const ctx = canvas.getContext('2d');

  const updateBrightness = () => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
      sum += brightness;
    }
    const averageBrightness = sum / (imageData.width * imageData.height);
    document.getElementById('brightness').innerText = averageBrightness.toFixed(2);

    requestAnimationFrame(updateBrightness);
  };

  updateBrightness();
}
