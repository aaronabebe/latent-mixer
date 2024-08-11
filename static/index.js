const audio1Input = document.getElementById("audio1");
const audio2Input = document.getElementById("audio2");
const audio1Player = document.getElementById("audio1Player");
const audio2Player = document.getElementById("audio2Player");
const interpolateBtn = document.getElementById("interpolateBtn");
const resultAudio = document.getElementById("resultAudio");
const interpolationSlider = document.getElementById(
  "interpolationSlider",
);
const interpolationValue = document.getElementById("interpolationValue");

const transformControls = ["scale", "rotate", "nonlinear"].map(
  (name) => ({
    active: document.getElementById(`${name}Active`),
    slider: document.getElementById(`${name}Slider`),
    value: document.getElementById(`${name}Value`),
  }),
);

function handleFileSelect(file, audioPlayer, waveformId) {
  if (file) {
    const url = URL.createObjectURL(file);
    audioPlayer.src = url;
    visualizeAudio(url, waveformId);
  }
}

function visualizeAudio(url, containerId) {
  const container = document.getElementById(containerId);
  const canvas = document.createElement("canvas");
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.innerHTML = "";
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const audioContext = new (window.AudioContext ||
    window.webkitAudioContext)();
  const source = audioContext.createBufferSource();

  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      const data = audioBuffer.getChannelData(0);
      const step = Math.ceil(data.length / canvas.width);
      const amp = canvas.height / 2;

      ctx.fillStyle = "#e2e27d";
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = data[i * step + j];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.fillRect(
          i,
          (1 + min) * amp,
          1,
          Math.max(1, (max - min) * amp),
        );
      }
    });
}

audio1Input.addEventListener("change", (event) => {
  handleFileSelect(event.target.files[0], audio1Player, "waveform1");
});

audio2Input.addEventListener("change", (event) => {
  handleFileSelect(event.target.files[0], audio2Player, "waveform2");
});

interpolationSlider.addEventListener("input", () => {
  interpolationValue.textContent = interpolationSlider.value;
});

transformControls.forEach((control) => {
  control.slider.addEventListener("input", () => {
    control.value.textContent = control.slider.value;
  });
});

interpolateBtn.addEventListener("click", async () => {
  if (!audio1Input.files[0] || !audio2Input.files[0]) {
    alert("Please select both audio files");
    return;
  }

  const formData = new FormData();
  formData.append("file1", audio1Input.files[0]);
  formData.append("file2", audio2Input.files[0]);
  formData.append("x", interpolationSlider.value);

  const transforms = {
    scale: parseFloat(transformControls[0].slider.value),
    rotate: parseFloat(transformControls[1].slider.value),
    nonlinear: parseFloat(transformControls[2].slider.value),
    scale_active: transformControls[0].active.checked,
    rotate_active: transformControls[1].active.checked,
    nonlinear_active: transformControls[2].active.checked,
  };

  formData.append("transforms", JSON.stringify(transforms));

  try {
    const response = await fetch("/interpolate/", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      resultAudio.src = url;
      resultAudio.play();
      visualizeAudio(url, "waveformResult");
    } else {
      console.error("Error:", response.statusText);
      alert("An error occurred during interpolation");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during interpolation");
  }
});
