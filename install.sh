#!/usr/bin/env bash
# Install the OpenSpec handoff workflow into a project that already ran `openspec init`.
# Usage: ./install.sh <project-dir> [--link] [--set-default] [--no-claude] [--no-cursor] [--opencode|--no-opencode] [--force]
#   --link         symlink instead of copy (keeps the project tracking this toolkit checkout)
#   --set-default  set `schema: handoff-driven` in openspec/config.yaml
#   --opencode     also install into .opencode/ (default: only if .opencode/ already exists)
#   --force        overwrite an existing .openspec-handoff/config.json
set -euo pipefail

usage() { sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
SRC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
LINK=0 SET_DEFAULT=0 CLAUDE=1 CURSOR=1 OPENCODE=auto FORCE=0 TARGET_ARG=
for a in "$@"; do  # options may come before or after the project dir
  case "$a" in
    -h|--help) usage 0;;
    --link) LINK=1;; --set-default) SET_DEFAULT=1;; --no-claude) CLAUDE=0;; --no-cursor) CURSOR=0;; --opencode) OPENCODE=1;; --no-opencode) OPENCODE=0;; --force) FORCE=1;;
    -*) echo "unknown option: $a" >&2; usage 2;;
    *) [ -z "$TARGET_ARG" ] || { echo "only one project dir allowed" >&2; usage 2; }; TARGET_ARG=$a;;
  esac
done
[ -n "$TARGET_ARG" ] || usage 2
TARGET=$(cd "$TARGET_ARG" && pwd)
if [ "$OPENCODE" = auto ]; then if [ -d "$TARGET/.opencode" ]; then OPENCODE=1; else OPENCODE=0; fi; fi
[ -d "$TARGET/openspec" ] || { echo "error: $TARGET has no openspec/ directory - run 'openspec init' first" >&2; exit 1; }

put() { # put <src> <dest>
  mkdir -p "$(dirname "$2")"
  rm -rf "$2"
  if [ "$LINK" = 1 ]; then ln -s "$1" "$2"; else cp -R "$1" "$2"; fi
  echo "  ${2#"$TARGET"/}"
}

echo "Installing into $TARGET"
put "$SRC/schemas/handoff-driven" "$TARGET/openspec/schemas/handoff-driven"
put "$SRC/scripts" "$TARGET/.openspec-handoff/scripts"
put "$SRC/docs/small-changes.md" "$TARGET/.openspec-handoff/small-changes.md"
put "$SRC/config/issue-tracker-openspec.md" "$TARGET/.openspec-handoff/issue-tracker-openspec.md"
if [ ! -e "$TARGET/.openspec-handoff/config.json" ] || [ "$FORCE" = 1 ]; then
  rm -f "$TARGET/.openspec-handoff/config.json"
  cp "$SRC/config/handoff-review.json" "$TARGET/.openspec-handoff/config.json"
  echo "  .openspec-handoff/config.json"
else
  echo "  .openspec-handoff/config.json (kept existing; --force to overwrite)"
fi
for s in "$SRC"/skills/*/; do
  name=$(basename "$s")
  [ "$CLAUDE" = 1 ] && put "${s%/}" "$TARGET/.claude/skills/$name"
  [ "$CURSOR" = 1 ] && put "${s%/}" "$TARGET/.cursor/skills/$name"
  [ "$OPENCODE" = 1 ] && put "${s%/}" "$TARGET/.opencode/skills/$name"
done
for c in "$SRC"/commands/claude/*.md; do [ "$CLAUDE" = 1 ] && put "$c" "$TARGET/.claude/commands/$(basename "$c")"; done
for c in "$SRC"/commands/cursor/*.md; do [ "$CURSOR" = 1 ] && put "$c" "$TARGET/.cursor/commands/$(basename "$c")"; done
for c in "$SRC"/commands/opencode/*.md; do [ "$OPENCODE" = 1 ] && put "$c" "$TARGET/.opencode/commands/$(basename "$c")"; done

if [ "$SET_DEFAULT" = 1 ]; then
  cfg="$TARGET/openspec/config.yaml"
  if [ -f "$cfg" ] && grep -q '^schema:' "$cfg"; then
    sed -i.bak 's/^schema:.*/schema: handoff-driven/' "$cfg" && rm -f "$cfg.bak"
  else
    printf 'schema: handoff-driven\n' | cat - "$cfg" 2>/dev/null > "$cfg.tmp" || printf 'schema: handoff-driven\n' > "$cfg.tmp"
    mv "$cfg.tmp" "$cfg"
  fi
  echo "  openspec/config.yaml -> schema: handoff-driven"
fi

gi="$TARGET/.gitignore"
grep -qxF '.superpowers/' "$gi" 2>/dev/null || { echo '.superpowers/' >> "$gi"; echo "  .gitignore += .superpowers/ (Superpowers SDD scratch)"; }

cat <<MSG

Done. Next:
  openspec schema validate handoff-driven
  openspec new change <id> --schema handoff-driven     # or rely on --set-default
  /handoff <id> ai-hero|superpowers <model>             # after proposal, specs, design
  /adversarial-review <id> --dry-run
Also install the execution toolkits themselves (not bundled):
  AI Hero:     https://github.com/mattpocock/skills  (grill-with-docs, to-spec, to-tickets, implement, tdd, code-review)
  Superpowers: https://github.com/obra/superpowers  (writing-plans, subagent-driven-development, requesting-code-review)
MSG
