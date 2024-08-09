<h1 align="center">
    latent-mixer
</h1>

<p align="center">
    A sound design tool for creation of experimental music and latent space exploration.
</p>

<p align="center">
    <a 
        href="https://opensource.org/licenses/MIT" 
        target="_blank"
        style="text-decoration: none"
    >
        <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
    </a>
    <a 
        href="https://twitter.com/mcaaroni" 
        target="_blank"
        style="text-decoration: none"
    >
        <img src="https://img.shields.io/twitter/url/https/twitter.com/mcaaroni.svg?style=social&label=Follow%20%40mcaaroni" alt="Twitter">
    </a>
</p>

---

If you find this interesting, please consider:

- following me on [Github](https://github.com/aaronabebe)
- following me on [Twitter](https://twitter.com/mcaaroni)

### Goals

My main goal for this tool is to provide a **quick and easy** way to mix 2-3 different samples to generate new
and **interesting** sounds.

## Installation

```sh
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

# Start the backend

```sh
fastapi dev main.py
```

open the backend running at [localhost:8000](localhost:8000)
