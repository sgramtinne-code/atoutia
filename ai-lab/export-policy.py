"""Export the inference weights of an Atoutia pilot checkpoint as JSON."""

import argparse
import hashlib
import io
import json
import pickle
from pathlib import Path

from train import CARD_COUNT, FORMAT, INPUT_SIZE, STYLES


def export(path):
    import torch

    with path.open("rb") as source:
        raw = source.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError("Checkpoint exceeds the pilot size limit")
    checkpoint = torch.load(io.BytesIO(raw), map_location="cpu", weights_only=True)
    if not isinstance(checkpoint, dict):
        raise ValueError("Invalid pilot checkpoint")
    metadata = checkpoint.get("metadata")
    state = checkpoint.get("modelState")
    if (
        not isinstance(metadata, dict)
        or metadata.get("format") != FORMAT
        or metadata.get("inputSize") != INPUT_SIZE
        or metadata.get("styles") != STYLES
        or metadata.get("teacher") != "varied-v1"
        or not isinstance(state, dict)
    ):
        raise ValueError("Unsupported pilot checkpoint")
    weights = {}
    for name, shape in (
        ("0.weight", (128, INPUT_SIZE)),
        ("0.bias", (128,)),
        ("2.weight", (CARD_COUNT, 128)),
        ("2.bias", (CARD_COUNT,)),
    ):
        tensor = state.get(name)
        if (
            not isinstance(tensor, torch.Tensor)
            or tensor.shape != shape
            or tensor.dtype != torch.float32
            or not tensor.isfinite().all().item()
        ):
            raise ValueError(f"Invalid checkpoint weights: {name}")
        weights[name] = tensor.tolist()
    fields = ("format", "inputSize", "styles", "cards", "teacher", "engineVersion", "rulesVersion")
    return {
        "format": "atoutia-card-policy-v1",
        "source": {field: metadata[field] for field in fields},
        "checkpointSha256": hashlib.sha256(raw).hexdigest(),
        "weights": weights,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(export(args.checkpoint), allow_nan=False, separators=(",", ":")))
    except (OSError, ValueError, ImportError, RuntimeError, KeyError, EOFError, pickle.UnpicklingError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
