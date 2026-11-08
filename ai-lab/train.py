"""Bounded card imitation experiment for the local Atoutia AI Lab."""

import argparse
import hashlib
import json
import math
from pathlib import Path
from time import perf_counter


FORMAT = "atoutia-card-imitation-v1"
INPUT_SIZE = 167
CARD_COUNT = 32
STYLES = ["CAREFUL", "TEAM", "BOLD"]
BATCH_SIZE = 256
SEED = 1234


def indices(values, limit):
    return (
        isinstance(values, list)
        and all(type(i) is int and 0 <= i < limit for i in values)
        and len(set(values)) == len(values)
    )


def read_dataset(path):
    with path.open("rb") as source:
        raw = source.read(32 * 1024 * 1024 + 1)
    if len(raw) > 32 * 1024 * 1024:
        raise ValueError("Dataset exceeds the pilot size limit")
    dataset = json.loads(raw)
    if (
        not isinstance(dataset, dict)
        or dataset.get("format") != FORMAT
        or dataset.get("inputSize") != INPUT_SIZE
        or dataset.get("styles") != STYLES
        or dataset.get("teacher") != "varied-v1"
    ):
        raise ValueError("Unsupported dataset format")
    cards = dataset.get("cards")
    if (
        not isinstance(cards, list) or len(cards) != CARD_COUNT
        or not all(isinstance(card, str) and card for card in cards)
        or len(set(cards)) != CARD_COUNT
    ):
        raise ValueError("Invalid card vocabulary")
    for name in ("train", "validation"):
        rows = dataset.get(name)
        if not isinstance(rows, list) or not 1 <= len(rows) <= 100000:
            raise ValueError(f"Invalid size for {name}")
        validate_rows(rows, name)
    return dataset, hashlib.sha256(raw).hexdigest()


def validate_rows(rows, name):
    for i, row in enumerate(rows):
        if not isinstance(row, list) or len(row) != 3:
            raise ValueError(f"Invalid {name} row {i}")
        features, legal, target = row
        if (
            not indices(features, INPUT_SIZE)
            or not indices(legal, CARD_COUNT)
            or not 2 <= len(legal) <= 8
            or not set(legal).issubset(features)
            or type(target) is not int or target not in legal
            or sum(32 <= j < 36 for j in features) != 1
            or sum(j >= 164 for j in features) != 1
        ):
            raise ValueError(f"Invalid features or legal mask in {name} row {i}")


def create_model(nn):
    return nn.Sequential(nn.Linear(INPUT_SIZE, 128), nn.ReLU(), nn.Linear(128, CARD_COUNT))


def tensors(torch, rows, device):
    inputs = torch.zeros((len(rows), INPUT_SIZE), dtype=torch.float32)
    legal = torch.zeros((len(rows), CARD_COUNT), dtype=torch.bool)
    feature_rows, feature_ids = [], []
    legal_rows, legal_ids = [], []
    targets = []
    for i, (features, allowed, target) in enumerate(rows):
        feature_rows.extend([i] * len(features))
        feature_ids.extend(features)
        legal_rows.extend([i] * len(allowed))
        legal_ids.extend(allowed)
        targets.append(target)
    inputs[feature_rows, feature_ids] = 1.0
    legal[legal_rows, legal_ids] = True
    return inputs.to(device), legal.to(device), torch.tensor(targets, device=device)


def train(args, dataset, fingerprint):
    import torch
    from torch import nn

    if args.device == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("CUDA is unavailable. Check the CUDA build of PyTorch in the lab venv.")
        torch.cuda.reset_peak_memory_stats()
        device_name = torch.cuda.get_device_name()
    else:
        torch.set_num_threads(2)
        device_name = "CPU"
    print(f"PyTorch {torch.__version__} | CUDA {torch.version.cuda} | {device_name}", flush=True)
    torch.manual_seed(SEED)
    x, mask, y = tensors(torch, dataset["train"], args.device)
    vx, vmask, vy = tensors(torch, dataset["validation"], args.device)
    model = create_model(nn).to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
    loss = nn.CrossEntropyLoss()
    uniform = vmask.sum(dim=1).float().reciprocal().mean().item()
    start = perf_counter()
    for epoch in range(1, args.epochs + 1):
        model.train()
        order = torch.randperm(len(x), device=args.device)
        for batch in order.split(BATCH_SIZE):
            optimizer.zero_grad(set_to_none=True)
            logits = model(x[batch]).masked_fill(~mask[batch], -torch.inf)
            loss(logits, y[batch]).backward()
            optimizer.step()
        model.eval()
        with torch.no_grad():
            logits = model(vx).masked_fill(~vmask, -torch.inf)
            prediction = logits.argmax(dim=1)
            if not vmask.gather(1, prediction.unsqueeze(1)).all().item():
                raise RuntimeError("Model produced an illegal card")
            validation_loss = loss(logits, vy).item()
            if not math.isfinite(validation_loss):
                raise RuntimeError("Training produced a non-finite validation loss")
            correct = prediction == vy
            accuracy = correct.float().mean().item()
        print(f"Epoch {epoch}/{args.epochs} | loss {validation_loss:.4f} | agreement {accuracy:.1%}", flush=True)

    elapsed = perf_counter() - start
    by_style = {}
    for i, style in enumerate(STYLES):
        selected = vx[:, 164 + i].bool()
        count = selected.sum().item()
        by_style[style] = {"choices": count, "agreement": correct[selected].float().mean().item() if count else None}
    report = {
        "format": FORMAT,
        "datasetSha256": fingerprint,
        "device": device_name,
        "torchVersion": str(torch.__version__),
        "cudaVersion": torch.version.cuda,
        "trainChoices": len(x),
        "validationChoices": len(vx),
        "epochs": args.epochs,
        "validationLoss": validation_loss,
        "agreement": accuracy,
        "uniformLegalAgreement": uniform,
        "byStyle": by_style,
        "elapsedSeconds": round(elapsed, 3),
        "trainChoicesPerSecondIncludingValidation": round(len(x) * args.epochs / elapsed),
    }
    if args.device == "cuda":
        report["peakAllocatedMiB"] = round(torch.cuda.max_memory_allocated() / 2**20, 2)

    args.output.mkdir(parents=True, exist_ok=False)
    temporary = args.output / "checkpoint.pt.tmp"
    torch.save({
        "metadata": {key: value for key, value in dataset.items() if key not in ("train", "validation")},
        "report": report,
        "modelState": model.state_dict(),
        "optimizerState": optimizer.state_dict(),
    }, temporary)
    temporary.replace(args.output / "checkpoint.pt")
    result = json.dumps(report, indent=2, allow_nan=False)
    (args.output / "report.json").write_text(result + "\n", encoding="utf-8")
    print(result)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    parser.add_argument("--epochs", type=int, choices=range(1, 21), default=5, metavar="1-20")
    args = parser.parse_args()
    if args.output.exists():
        parser.error("Choose a new output directory to preserve previous results")
    try:
        dataset, fingerprint = read_dataset(args.dataset)
        train(args, dataset, fingerprint)
    except (ValueError, OSError, ImportError, RuntimeError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
