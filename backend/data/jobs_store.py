"""Jobs store: persistent job queue backed by jobs.json."""
import json
import os

_JOBS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.json")


def load() -> list:
    try:
        with open(_JOBS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save(jobs: list) -> None:
    with open(_JOBS_PATH, "w", encoding="utf-8") as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)


def append(job: dict) -> None:
    jobs = load()
    jobs.append(job)
    save(jobs)
