#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export ROOT_DIR

echo 'Running checker suite...'
zsh "$ROOT_DIR/tests/run-checker-suite.sh"

echo 'Running PDF detection suite...'
zsh "$ROOT_DIR/tests/run-pdf-detection-suite.sh"

echo 'LEXCITE_TESTS_OK'
