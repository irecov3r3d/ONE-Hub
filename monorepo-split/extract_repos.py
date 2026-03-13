import os
import subprocess
import shutil

# Configuration
GITHUB_USER = "irecov3r3d"
SOURCE_REPO = f"https://github.com/{GITHUB_USER}/ONE-Hub.git"
WORK_DIR = os.getcwd()

PROJECT_MAP = {
    "claude/beat-maker-app-Fhpg2": "beat-maker-app",
    "claude/music-vault-app-DNlEb": "music-vault-app",
    "claude/song-generator-T7GUx": "song-generator",
    "claude/chrome-extension-replica-4L8Ec": "chrome-extension",
    "claude/firefox-teach-repeat-extension-gRNKL": "firefox-extension",
    "claude/auto-split-video-clips-gwIQz": "video-splitter",
    "claude/keyboard-window-splitter-fCMem": "keyboard-window-splitter",
    "claude/audio-analysis-mastering-tool-ySQzQ": "audio-mastering-tool",
    "claude/multi-tab-ai-automation-X7gEG": "multi-tab-automation",
    "codex/add-mvp-features-for-voice-recorder": "voice-recorder",
    "codex/build-linux-mint-desktop-environment": "linux-desktop-env",
    "LemmeGitDat--Modular-build-for-local-areas-to-track-through-community-whats-popping-near-them": "lemmegitdat-community"
}

def run_cmd(cmd, cwd=None, check=True):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, text=True, capture_output=True)
    if result.returncode != 0 and check:
        print(f"Error executing command: {' '.join(cmd)}")
        print(result.stdout)
        print(result.stderr)
        raise Exception(f"Command failed with code {result.returncode}")
    return result

def main():
    print("Starting ONE-Hub monorepo extraction...")

    # 1. Clone the backup repository
    one_hub_dir = os.path.join(WORK_DIR, "ONE-Hub")
    if not os.path.exists(one_hub_dir):
        print("Cloning ONE-Hub...")
        run_cmd(["git", "clone", SOURCE_REPO, "ONE-Hub"])
        run_cmd(["git", "fetch", "--all"], cwd=one_hub_dir)
    else:
        print("ONE-Hub backup already exists, skipping clone.")

    # 2. Extract each project
    for branch, repo_name in PROJECT_MAP.items():
        print(f"\n--- Extracting {repo_name} from branch {branch} ---")
        repo_dir = os.path.join(WORK_DIR, repo_name)

        if os.path.exists(repo_dir):
            print(f"Directory {repo_name} already exists. Attempting clean extraction...")
            shutil.rmtree(repo_dir)

        # Initialize new repository
        os.makedirs(repo_dir, exist_ok=True)
        run_cmd(["git", "init"], cwd=repo_dir)

        # Add local ONE-Hub as remote and fetch branch
        run_cmd(["git", "remote", "add", "source", one_hub_dir], cwd=repo_dir)
        try:
            # First fetch the branch from origin into local ONE-Hub if it is missing locally
            run_cmd(["git", "fetch", "origin", f"{branch}:{branch}"], cwd=one_hub_dir, check=False)
            # Now fetch from local ONE-Hub into the new repo
            run_cmd(["git", "fetch", "source", f"{branch}:{branch}"], cwd=repo_dir)
        except Exception as e:
            print(f"Failed to fetch {branch}. It might not exist in the source repository. Error: {e}")
            shutil.rmtree(repo_dir)
            continue

        # Checkout branch
        try:
            run_cmd(["git", "checkout", branch], cwd=repo_dir)
        except Exception:
            print(f"Failed to checkout {branch}. Skipping.")
            shutil.rmtree(repo_dir)
            continue

        # Rename branch to main
        run_cmd(["git", "branch", "-m", "main"], cwd=repo_dir)

        # Remove local source remote
        run_cmd(["git", "remote", "remove", "source"], cwd=repo_dir)

        print(f"Successfully extracted {repo_name}")

if __name__ == "__main__":
    main()
