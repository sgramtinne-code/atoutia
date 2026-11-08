"""Train the Atoutia pilot from complete games and resume at round boundaries."""

import argparse
import fcntl
import json
import os
import pickle
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from time import perf_counter

from export_policy import export
from train import FORMAT as IMITATION_FORMAT, create_model, tensors, validate_rows


LAB = Path(__file__).resolve().parent
FORMAT = "atoutia-card-self-play-v1"


def atomic_write(path, write):
    with NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
        temp_path = Path(temporary.name)
        try:
            write(temporary)
            temporary.flush()
            os.fsync(temporary.fileno())
            temp_path.replace(path)
        finally:
            temp_path.unlink(missing_ok=True)


def command_json(command):
    return json.loads(subprocess.check_output(command))


def export_policy(checkpoint, output):
    output.write_text(
        json.dumps(export(checkpoint), allow_nan=False, separators=(",", ":")),
        encoding="utf-8",
    )


def benchmark(policy):
    return command_json(["node", LAB / "benchmark.mjs", "--policy", policy])


def load(torch, path):
    if path.stat().st_size > 8 * 1024 * 1024:
        raise ValueError("Checkpoint exceeds the pilot size limit")
    checkpoint = torch.load(path, map_location="cpu", weights_only=True)
    if not isinstance(checkpoint, dict):
        raise ValueError("Invalid checkpoint")
    metadata = checkpoint.get("metadata")
    if not isinstance(metadata, dict) or metadata.get("format") != IMITATION_FORMAT:
        raise ValueError("Self-play currently requires a v1 pilot checkpoint")
    return checkpoint


def update(torch, model, optimizer, rollout, round_number, matches, device, reward_mode):
    episodes = rollout["episodes"]
    if (
        rollout.get("format") != "atoutia-card-rollout-v1"
        or rollout.get("round") != round_number
        or rollout.get("firstIndex") != 4096 + (round_number - 1) * 96
        or len(episodes) != matches
    ):
        raise ValueError("Unexpected rollout format or seed block")
    rows, weights = [], []
    for episode in episodes:
        decisions = episode["rows"]
        reward = episode["reward"]
        if type(reward) is not int or reward not in (-1, 1) or not 1 <= len(decisions) <= 2000:
            raise ValueError("Invalid completed episode")
        validate_rows(decisions, "rollout")
        rows.extend(decisions)
        if reward_mode == "deal":
            deal_rewards = episode["dealRewards"]
            if (
                not isinstance(deal_rewards, list)
                or len(deal_rewards) != len(decisions)
                or any(type(value) not in (int, float) or not -1 <= value <= 1 for value in deal_rewards)
            ):
                raise ValueError("Invalid deal rewards")
            weights.extend(value / len(decisions) for value in deal_rewards)
        else:
            weights.extend([reward / len(decisions)] * len(decisions))

    x, legal, chosen = tensors(torch, rows, device)
    parameter_device = next(model.parameters()).device
    if any(tensor.device != parameter_device for tensor in (x, legal, chosen)):
        raise RuntimeError("Training tensors and model parameters are on different devices")
    model.train()
    optimizer.zero_grad(set_to_none=True)
    logits = model(x).masked_fill(~legal, -torch.inf)
    log_prob = logits.log_softmax(dim=1).gather(1, chosen[:, None]).squeeze(1)
    loss = -(log_prob * torch.tensor(weights, device=device)).sum() / matches
    if not loss.isfinite().item():
        raise RuntimeError("Non-finite policy loss")
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0, error_if_nonfinite=True)
    optimizer.step()
    if device == "cuda":
        torch.cuda.synchronize()
    return {
        "round": round_number,
        "matches": matches,
        "wins": sum(e["reward"] == 1 for e in episodes),
        "decisions": len(rows),
    }


def run(args, torch, temporary):
    started = perf_counter()
    timings = dict.fromkeys(("policyExport", "simulation", "trainingUpdate", "checkpointSave", "benchmark"), 0.0)

    def timed(phase, action, *values):
        start = perf_counter()
        result = action(*values)
        duration = perf_counter() - start
        timings[phase] += duration
        return result, duration

    latest = args.output / "latest.pt"
    policy = temporary / "policy.json"
    model = create_model(torch.nn).to(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.0001)
    if args.resume:
        checkpoint = load(torch, latest)
        progress = checkpoint.get("selfPlay")
        if not isinstance(progress, dict) or progress.get("format") != FORMAT:
            raise ValueError("Output directory does not contain a self-play checkpoint")
        if progress["device"] != args.device:
            raise ValueError("Resume with the device used for the original run")
        reward_mode = progress.get("rewardMode", "match")
        if reward_mode not in ("match", "deal") or (args.reward is not None and args.reward != reward_mode):
            raise ValueError("Resume with the original reward mode")
        matches = progress["matchesPerRound"]
        if args.matches is not None and args.matches != matches:
            raise ValueError("Resume with the original number of matches per round")
        optimizer_state = checkpoint["optimizerState"]
    else:
        checkpoint = load(torch, args.initial)
        if "selfPlay" in checkpoint:
            raise ValueError("Use --resume for a self-play checkpoint")
        timed("policyExport", export_policy, args.initial, policy)
        initial_benchmark, _ = timed("benchmark", benchmark, policy)
        matches = args.matches or 12
        reward_mode = args.reward or "match"
        progress = {
            "format": FORMAT,
            "device": args.device,
            "matchesPerRound": matches,
            "rewardMode": reward_mode,
            "initialBenchmark": initial_benchmark,
            "history": [],
        }
    history = progress["history"]
    if args.rounds < len(history):
        raise ValueError("Target rounds cannot be below the saved progress")
    model.load_state_dict(checkpoint["modelState"])
    if args.resume:
        optimizer.load_state_dict(optimizer_state)

    def save():
        atomic_write(latest, lambda destination: torch.save({
            "metadata": checkpoint["metadata"],
            "modelState": model.state_dict(),
            "optimizerState": optimizer.state_dict(),
            "selfPlay": progress,
        }, destination))

    if not args.resume:
        timed("checkpointSave", save)
    starting_round = len(history)
    print(f"Starting at {starting_round}/{args.rounds} rounds on {args.device}.", flush=True)
    model_device = str(next(model.parameters()).device)
    print(f"Model parameters: {model_device} | simulation and evaluation: CPU", flush=True)
    for round_number in range(starting_round + 1, args.rounds + 1):
        timed("policyExport", export_policy, latest, policy)
        rollout, simulation_seconds = timed("simulation", command_json, [
            "node", LAB / "rollout.mjs", "--policy", policy,
            "--round", str(round_number), "--matches", str(matches), "--reward", reward_mode,
        ])
        result, update_seconds = timed(
            "trainingUpdate", update, torch, model, optimizer, rollout, round_number, matches, args.device, reward_mode,
        )
        history.append(result)
        timed("checkpointSave", save)
        print(
            f"Saved round {round_number}/{args.rounds}: {result['wins']}/{matches} wins, "
            f"{result['decisions']} decisions | simulation {simulation_seconds:.2f}s, "
            f"update {update_seconds:.2f}s",
            flush=True,
        )

    timed("policyExport", export_policy, latest, policy)
    trained_benchmark, _ = timed("benchmark", benchmark, policy)
    report = {
        "format": FORMAT,
        "device": args.device,
        "modelDevice": model_device,
        "rewardMode": reward_mode,
        "rounds": len(history),
        "roundsCompletedThisRun": len(history) - starting_round,
        "timingsSecondsThisRun": {
            **{phase: round(seconds, 6) for phase, seconds in timings.items()},
            "total": round(perf_counter() - started, 6),
        },
        "trainingMatches": sum(item["matches"] for item in history),
        "trainingDecisions": sum(item["decisions"] for item in history),
        "history": history,
        "initialBenchmark": progress["initialBenchmark"],
        "trainedBenchmark": trained_benchmark,
    }
    if args.device == "cuda":
        report["deviceName"] = torch.cuda.get_device_name()
        report["peakAllocatedMiB"] = round(torch.cuda.max_memory_allocated() / 2**20, 2)
    result = json.dumps(report, indent=2, allow_nan=False) + "\n"
    atomic_write(args.output / "report.json", lambda destination: destination.write(result.encode("utf-8")))
    print(result, end="")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    origin = parser.add_mutually_exclusive_group(required=True)
    origin.add_argument("--initial", type=Path)
    origin.add_argument("--resume", action="store_true")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    parser.add_argument("--rounds", type=int, required=True)
    parser.add_argument("--matches", type=int, help="Matches per round, default 12 for a new run")
    parser.add_argument("--reward", choices=("match", "deal"), help="Reward mode, default match for a new run")
    args = parser.parse_args()
    if not 1 <= args.rounds <= 128:
        parser.error("--rounds must be between 1 and 128")
    if args.matches is not None and (not 3 <= args.matches <= 96 or args.matches % 3):
        parser.error("--matches must be a multiple of three between 3 and 96")
    try:
        import torch

        if args.device == "cuda":
            if not torch.cuda.is_available():
                raise RuntimeError("CUDA is unavailable. Check the lab venv.")
            torch.cuda.reset_peak_memory_stats()
            print(f"CUDA: {torch.cuda.get_device_name()}", flush=True)
        else:
            torch.set_num_threads(2)
        if not args.resume:
            args.output.mkdir(parents=True, exist_ok=False)
        with (args.output / ".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with TemporaryDirectory(dir=args.output) as path:
                run(args, torch, Path(path))
    except KeyboardInterrupt:
        parser.exit(130, "AI Lab: interrupted. Resume from latest.pt if it was saved.\n")
    except BlockingIOError:
        parser.exit(1, "AI Lab: this run is already in use\n")
    except (ValueError, OSError, ImportError, RuntimeError, KeyError, TypeError, EOFError,
            pickle.UnpicklingError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"AI Lab: {error}\n")


if __name__ == "__main__":
    main()
