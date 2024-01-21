const video = document.getElementById("video");
const videoContainer = document.getElementById("video-wrapper");
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
        // width: { min: 640, ideal: 1280, max: 1920 },
        // height: { min: 360, ideal: 720, max: 1080 },
        width: video.offsetWidth,
        height: video.offsetHeight,
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
  const canvasSize = { width: video.offsetWidth, height: video.offsetHeight };
  console.log(canvasSize, video.offsetWidth, video.offsetHeight);
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
    const rect = video.getBoundingClientRect();
    const range_x = [(rect.right - rect.left) * 2 / 5, (rect.right - rect.left) * 3 / 5];
    const range_y = [(rect.bottom - rect.top) * 2 / 5, (rect.bottom - rect.top) * 3 / 5];
    detectionsDraw(canvas, DetectionsArray);
    if (DetectionsArray.length != 0) {
      position = DetectionsArray[0]["landmarks"]["_positions"];
      document.getElementById('position_x').innerText = position[27]["_x"];
      document.getElementById('position_y').innerText = position[27]["_y"];
      // if (Math.trunc(position[27]["_x"] / 100) == 3 && Math.trunc(position[27]["_y"] / 100) == 3) {
      if (range_x[0] <= position[27]["_x"] && position[27]["_x"] <= range_x[1] && range_y[0] <= position[27]["_y"] && position[27]["_y"] <= range_y[1]) {
        document.getElementById('face-position-result').innerText = '✅ちょうど良い';
        document.getElementById('face-position-result').style.color = "black";
      } else {
        document.getElementById('face-position-result').innerText = '🚫中央からずれている';
        document.getElementById('face-position-result').style.color = "red";
      }
      expressions = DetectionsArray[0]["expressions"];
      let maxKey = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
      if (maxKey == 'happy') {
        document.getElementById('face-expression-result').innerText = '✅ちょうどいい';
        document.getElementById('face-expression-result').style.color = "black";
      } else {
        document.getElementById('face-expression-result').innerText = '🚫堅すぎる';
        document.getElementById('face-expression-result').style.color = "red";
      }
      document.getElementById('expressions').innerText = maxKey;
    }
  }, 100);
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

        if (70 < average && average < 80) {
          document.getElementById('voice-volume-result').innerText = '🚫小さすぎる';
          document.getElementById('voice-volume-result').style.color = "red";
        } else if (80 <= average && average < 100) {
          document.getElementById('voice-volume-result').innerText = '✅ちょうど良い';
          document.getElementById('voice-volume-result').style.color = "black";
        } else if (100 <= average && average < 120) {
          document.getElementById('voice-volume-result').innerText = '🚫大きすぎる';
          document.getElementById('voice-volume-result').style.color = "red";
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
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');

  const updateBrightness = () => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        sum += brightness;
      }
      const averageBrightness = sum / (imageData.width * imageData.height);
      if (averageBrightness < 100) {
        document.getElementById('brightness-result').innerText = '🚫暗すぎる';
        document.getElementById('brightness-result').style.color = "red";
      } else if (averageBrightness < 150) {
        document.getElementById('brightness-result').innerText = '✅ちょうど良い';
        document.getElementById('brightness-result').style.color = "black";
      } else {
        document.getElementById('brightness-result').innerText = '🚫明るすぎる';
        document.getElementById('brightness-result').style.color = "red";
      }
      document.getElementById('brightness').innerText = averageBrightness.toFixed(2);
    }

    requestAnimationFrame(updateBrightness);
  };

  updateBrightness();
}

