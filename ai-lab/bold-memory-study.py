"""Train and compare three paired Audacieux models on rotated PNJ seats."""

import argparse
import json
import subprocess
from pathlib import Path

from export_policy import export
from train import MEMORY_FORMAT, SEED, read_dataset, train

LAB = Path(__file__).resolve().parent


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(args):
    dataset, fingerprint = read_dataset(args.dataset)
    if dataset["format"] != MEMORY_FORMAT:
        raise ValueError("Use a dataset generated with --history")
    args.output.mkdir(parents=True, exist_ok=False)
    repetitions = []
    for seed in range(SEED, SEED + 3):
        pair = args.output / f"seed-{seed}"
        print(f"Training pair with seed {seed}", flush=True)
        for mode in ("off", "on"):
            model = pair / mode
            training = train(argparse.Namespace(
                device=args.device, epochs=args.epochs, history_mode=mode, output=model,
            ), dataset, fingerprint, seed=seed)
            write_json(pair / f"{mode}.json", export(model / "checkpoint.pt"))
        print(f"Evaluating seed {seed} at all three PNJ seats", flush=True)
        result = subprocess.run([
            "node", str(LAB / "benchmark-bold-memory.mjs"),
            "--off", str(pair / "off.json"), "--on", str(pair / "on.json"),
            "--seeds", str(args.seeds),
        ], capture_output=True, text=True, check=True)
        report = json.loads(result.stdout)
        write_json(pair / "report.json", report)
        repetitions.append(report)
    write_json(args.output / "report.json", {
        "format": "atoutia-bold-memory-study-v1",
        "device": args.device,
        "deviceName": training["device"],
        "totalMatches": sum(report["totalMatches"] for report in repetitions),
        "repetitions": repetitions,
    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dataset", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    parser.add_argument("--epochs", type=int, choices=range(1, 21), default=10, metavar="1-20")
    parser.add_argument("--seeds", type=int, choices=range(1, 129), default=128, metavar="1-128")
    try:
        run(parser.parse_args())
    except subprocess.CalledProcessError as error:
        parser.exit(1, error.stderr or f"AI Lab: benchmark failed with status {error.returncode}\n")
    except (ValueError, OSError, ImportError, RuntimeError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
