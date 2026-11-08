"""Export the inference weights of an Atoutia pilot checkpoint as JSON."""

import argparse
import hashlib
import io
import json
import pickle
import re
from pathlib import Path

from train import CARD_COUNT, FORMAT, INPUT_SIZE, MEMORY_FORMAT, MEMORY_INPUT_SIZE, STYLES


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
        or (metadata.get("format"), metadata.get("inputSize"))
        not in ((FORMAT, INPUT_SIZE), (MEMORY_FORMAT, MEMORY_INPUT_SIZE))
        or metadata.get("styles") != STYLES
        or metadata.get("teacher") != "varied-v1"
        or not isinstance(state, dict)
    ):
        raise ValueError("Unsupported pilot checkpoint")
    weights = {}
    for name, shape in (
        ("0.weight", (128, metadata["inputSize"])),
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
    policy = {
        "format": "atoutia-card-policy-v1",
        "source": {field: metadata[field] for field in fields},
        "checkpointSha256": hashlib.sha256(raw).hexdigest(),
        "weights": weights,
    }
    if metadata["format"] == MEMORY_FORMAT:
        mode = metadata.get("historyMode")
        report = checkpoint.get("report")
        fingerprint = report.get("datasetSha256") if isinstance(report, dict) else None
        epochs = report.get("epochs") if isinstance(report, dict) else None
        if (
            mode not in ("on", "off")
            or not isinstance(fingerprint, str)
            or re.fullmatch(r"[0-9a-f]{64}", fingerprint) is None
            or type(epochs) is not int or not 1 <= epochs <= 20
        ):
            raise ValueError("Invalid history training metadata")
        policy["source"]["historyMode"] = mode
        policy["imitation"] = {"datasetSha256": fingerprint, "epochs": epochs}
    if "selfPlay" in checkpoint:
        progress = checkpoint["selfPlay"]
        initial = progress.get("initialBenchmark") if isinstance(progress, dict) else None
        fingerprint = initial.get("checkpointSha256") if isinstance(initial, dict) else None
        if not isinstance(fingerprint, str) or re.fullmatch(r"[0-9a-f]{64}", fingerprint) is None:
            raise ValueError("Invalid initial checkpoint fingerprint")
        policy["initialCheckpointSha256"] = fingerprint
        if "rewardMode" in progress:
            policy["training"] = {
                "rewardMode": progress["rewardMode"],
                "rounds": len(progress["history"]),
                "matchesPerRound": progress["matchesPerRound"],
            }
    return policy


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
