#!/bin/bash
# Double-click from Finder (Mac)
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$DIR/installer/update_dump.sh"
