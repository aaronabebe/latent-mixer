import io
import json
from pathlib import Path

import numpy as np
import torch
import torchaudio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from stable_audio_tools.models.factory import create_model_from_config
from stable_audio_tools.models.utils import load_ckpt_state_dict
from stable_audio_tools.training.utils import copy_state_dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL = None
SAMPLE_RATE = 44100


def load_model():
    global MODEL
    if MODEL is None:
        config_path = Path("vae_config.json")
        checkpoint_path = Path("vae.ckpt")
        with config_path.open() as f:
            config = json.load(f)
        vae = create_model_from_config(config)
        copy_state_dict(vae, load_ckpt_state_dict(str(checkpoint_path)))
        MODEL = vae.to(DEVICE).eval().requires_grad_(False)
    return MODEL


@torch.no_grad()
def process_audio(tensor):
    model = load_model()
    encoded = model.encode(tensor)
    return encoded


async def read_audio(file: UploadFile) -> torch.Tensor:
    content = await file.read()
    buffer = io.BytesIO(content)
    tensor, sr = torchaudio.load(buffer)
    if sr != SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(sr, SAMPLE_RATE)
        tensor = resampler(tensor)
    return tensor.to(DEVICE)


def weighted_average(vec1, vec2, weight):
    return (1 - weight) * vec1 + weight * vec2


def scale_transform(vec, factor):
    return vec * factor


def rotate_transform(vec, factor):
    angle = factor * np.pi
    cos, sin = np.cos(angle), np.sin(angle)
    rotation_matrix = torch.tensor(
        [[cos, -sin], [sin, cos]], device=vec.device, dtype=torch.float32
    )
    orig_shape = vec.shape
    vec_2d = vec.reshape(-1, 2)
    rotated = torch.matmul(vec_2d, rotation_matrix)
    return rotated.reshape(orig_shape)


def nonlinear_transform(vec, factor):
    return torch.tanh(vec * (1 + factor))


class TransformParams(BaseModel):
    scale: float
    rotate: float
    nonlinear: float
    scale_active: bool
    rotate_active: bool
    nonlinear_active: bool


@app.post("/interpolate/")
async def interpolate_audio(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    x: float = Form(...),
    transforms: str = Form(...),
):
    try:
        transform_params = TransformParams.parse_raw(transforms)

        # Read and process audio files
        tensor1 = await read_audio(file1)
        tensor2 = await read_audio(file2)

        # Ensure both audio samples are the same length
        min_length = min(tensor1.shape[1], tensor2.shape[1])
        tensor1 = tensor1[:, :min_length]
        tensor2 = tensor2[:, :min_length]

        # Encode audio
        encoded1 = process_audio(tensor1.unsqueeze(0))
        encoded2 = process_audio(tensor2.unsqueeze(0))

        # Apply weighted average
        interpolated = weighted_average(encoded1, encoded2, x)

        # Apply transformations
        if transform_params.scale_active:
            interpolated = scale_transform(interpolated, transform_params.scale)
        if transform_params.rotate_active:
            interpolated = rotate_transform(interpolated, transform_params.rotate)
        if transform_params.nonlinear_active:
            interpolated = nonlinear_transform(interpolated, transform_params.nonlinear)

        # Decode
        model = load_model()
        decoded = model.decode(interpolated)

        # Convert to audio file
        decoded = decoded.squeeze(0).cpu()
        buffer = io.BytesIO()
        torchaudio.save(buffer, decoded, SAMPLE_RATE, format="wav")
        buffer.seek(0)

        return StreamingResponse(buffer, media_type="audio/wav")

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))


app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
