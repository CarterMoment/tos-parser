#!/usr/bin/env bash
set -euo pipefail

rm -rf build function.zip
mkdir -p build

python -m pip install --upgrade pip

# Install Linux-compatible wheels into build/ (works from Windows)
python -m pip install \
  --only-binary=:all: \
  --platform manylinux2014_x86_64 \
  --implementation cp \
  --python-version 3.11 \
  -t build \
  -r requirements.txt

cp -r app build/

python - <<'PY'
import os, zipfile
with zipfile.ZipFile('function.zip','w',zipfile.ZIP_DEFLATED) as z:
    for root,_,files in os.walk('build'):
        for f in files:
            p=os.path.join(root,f)
            z.write(p, os.path.relpath(p,'build'))
print("Built function.zip")
PY
