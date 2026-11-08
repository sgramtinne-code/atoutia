"""Compare match and deal rewards from three Audacieux imitation checkpoints."""

import argparse
import json
import pickle
import subprocess
import sys
from pathlib import Path

from export_policy import export
from train import SEED


LAB = Path(__file__).resolve().parent
ROUNDS = 32
MATCHES = 48


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def initial_checkpoints(study):
    checkpoints = []
    for seed in range(SEED, SEED + 3):
        path = study / f"seed-{seed}" / "on" / "checkpoint.pt"
        policy = export(path)
        if (policy["source"].get("historyMode") != "on"
                or policy["imitation"].get("seed") != seed
                or "initialCheckpointSha256" in policy):
            raise ValueError(f"Expected the imitation checkpoint with memory for seed {seed}")
        metadata = policy["imitation"]
        checkpoints.append((seed, path, policy["checkpointSha256"], metadata["datasetSha256"], metadata["epochs"]))
    if len({(dataset, epochs) for _, _, _, dataset, epochs in checkpoints}) != 1:
        raise ValueError("The three imitation checkpoints must use the same dataset and epoch count")
    return checkpoints


def run(args):
    checkpoints = initial_checkpoints(args.study)
    args.output.mkdir(parents=True, exist_ok=False)
    repetitions = []
    for seed, checkpoint, fingerprint, _, _ in checkpoints:
        pair = args.output / f"seed-{seed}"
        pair.mkdir()
        training = {}
        for mode in ("match", "deal"):
            target = pair / mode
            print(f"Training seed {seed}, reward {mode}. Log: {pair / (mode + '.log')}", flush=True)
            with (pair / f"{mode}.log").open("w", encoding="utf-8") as log:
                subprocess.run([
                    sys.executable, str(LAB / "self-play.py"), "--initial", str(checkpoint),
                    "--output", str(target), "--device", args.device, "--reward", mode,
                    "--rounds", str(ROUNDS), "--matches", str(MATCHES),
                ], stdout=log, check=True)
            report = json.loads((target / "report.json").read_text(encoding="utf-8"))
            training[mode] = {
                "modelDevice": report["modelDevice"],
                "deviceName": report.get("deviceName", "CPU"),
                "trainingMatches": report["trainingMatches"],
            }
            write_json(pair / f"{mode}.json", export(target / "latest.pt"))
        print(f"Evaluating seed {seed} on the reserved distributions", flush=True)
        result = subprocess.run([
            "node", str(LAB / "benchmark-bold-memory.mjs"), "--confirm-reward",
            "--match", str(pair / "match.json"), "--deal", str(pair / "deal.json"),
        ], capture_output=True, text=True, check=True)
        comparison = json.loads(result.stdout)
        if comparison["initialCheckpointSha256"] != fingerprint:
            raise ValueError("The imitation checkpoint changed during the campaign")
        report = {"seed": seed, "training": training, **comparison}
        write_json(pair / "report.json", report)
        repetitions.append(report)
    write_json(args.output / "report.json", {
        "format": "atoutia-bold-memory-reward-confirmation-v1",
        "trainingMatches": sum(
            mode["trainingMatches"] for pair in repetitions for mode in pair["training"].values()
        ),
        "benchmarkMatches": sum(pair["totalMatches"] for pair in repetitions),
        "repetitions": repetitions,
    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("study", type=Path, help="Imitation study run directory containing seed-1234 to seed-1236")
    parser.add_argument("--output", type=Path, required=True, help="New output directory")
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    try:
        run(parser.parse_args())
    except subprocess.CalledProcessError as error:
        parser.exit(1, error.stderr or f"AI Lab: {Path(error.cmd[1]).name} failed with status {error.returncode}\n")
    except (ValueError, OSError, ImportError, RuntimeError, KeyError, EOFError, pickle.UnpicklingError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
