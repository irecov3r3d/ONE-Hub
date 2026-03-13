import subprocess

cmd = "git push -u origin main"
result = subprocess.run(cmd, cwd="/app/monorepo-split/chrome-extension", shell=True, text=True, capture_output=True)
print(result.stdout)
print(result.stderr)
