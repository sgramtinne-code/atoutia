"""Train matched Audacieux imitation models with a fixed or rotating seat."""

import argparse
import json
import pickle
import subprocess
from pathlib import Path

from export_policy import export
from train import SEED, read_dataset, train


LAB = Path(__file__).resolve().parent


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(args):
    args.output.mkdir(parents=True, exist_ok=False)
    subprocess.run(["node", LAB / "generate-bold-seat-imitation.mjs", args.output], check=True)
    modes = ("fixed", "rotated")
    datasets = {mode: read_dataset(args.output / f"{mode}-data.json") for mode in modes}
    repetitions = []
    for seed in range(SEED, SEED + 3):
        pair = args.output / f"seed-{seed}"
        for mode in modes:
            print(f"Training seed {seed}, {mode} seat", flush=True)
            model = pair / mode
            dataset, fingerprint = datasets[mode]
            training = train(argparse.Namespace(
                device=args.device, epochs=10, history_mode="on", output=model,
            ), dataset, fingerprint, seed=seed)
            write_json(pair / f"{mode}.json", export(model / "checkpoint.pt"))
        print(f"Evaluating seed {seed} at all three seats", flush=True)
        comparison = subprocess.check_output([
            "node", LAB / "benchmark-bold-memory.mjs",
            "--fixed", pair / "fixed.json", "--rotated", pair / "rotated.json",
        ])
        report = json.loads(comparison)
        write_json(pair / "report.json", report)
        repetitions.append(report)
    write_json(args.output / "report.json", {
        "format": "atoutia-bold-seat-imitation-study-v1",
        "device": args.device,
        "deviceName": training["device"],
        "choicesBySeat": {
            mode: {split: datasets[mode][0][f"{split}BySeat"] for split in ("train", "validation")}
            for mode in modes
        },
        "benchmarkMatches": sum(pair["totalMatches"] for pair in repetitions),
        "repetitions": repetitions,
    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    try:
        run(parser.parse_args())
    except (ValueError, OSError, ImportError, RuntimeError, KeyError, EOFError,
            pickle.UnpicklingError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
