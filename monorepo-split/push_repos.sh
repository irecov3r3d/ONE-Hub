#!/bin/bash

GITHUB_USER="irecov3r3d"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable not set."
    return 1
fi

declare -A REPOS=(
    ["beat-maker-app"]="beat-maker-app"
    ["music-vault-app"]="music-vault-app"
    ["song-generator"]="song-generator"
    ["chrome-extension"]="chrome-extension"
    ["firefox-extension"]="firefox-extension"
    ["video-splitter"]="video-splitter"
    ["keyboard-window-splitter"]="keyboard-window-splitter"
    ["audio-mastering-tool"]="audio-mastering-tool"
    ["multi-tab-automation"]="multi-tab-automation"
    ["voice-recorder"]="voice-recorder"
    ["linux-desktop-env"]="linux-desktop-env"
    ["lemmegitdat-community"]="lemmegitdat-community"
)

cd /app/monorepo-split

for repo_name in "${!REPOS[@]}"; do
    if [ ! -d "$repo_name" ]; then
        echo "Directory $repo_name not found. Skipping."
        continue
    fi

    echo ""
    echo "📤 Pushing: $repo_name"
    cd "$repo_name"

    # Remove origin if it exists
    git remote remove origin 2>/dev/null || true

    # Add origin with token authentication
    git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${repo_name}.git"

    # Push main branch
    if git push -u origin main; then
        echo "✓ Successfully pushed $repo_name"
    else
        echo "✗ Failed to push $repo_name. Is the repository created and empty on GitHub?"
    fi

    cd ..
done

echo ""
echo "🎉 All pushing attempts completed!"
