# Finds a Postgres 15+ server (initdb, pg_ctl, postgres and psql in one
# folder) and puts it first on PATH. Sourced by run-local.sh and
# bot/quests-sandbox.sh; 15 is the production major (supabase/config.toml).
#
# PG_BIN wins when set. Otherwise: the folder `postgres` on PATH lives in, then
# the usual install folders (Ubuntu /usr/lib/postgresql/<major>/bin, Homebrew
# kegs, Postgres.app), newest major first. A client-only libpq can put its own
# initdb and pg_ctl first on PATH, so all four binaries must sit together.
#
# Sets PG_BIN and PG_MAJOR. Exits 2 with the install command when nothing fits.

PG_MIN_MAJOR=15

pg_preflight__complete() {
  [ -x "$1/initdb" ] && [ -x "$1/pg_ctl" ] && [ -x "$1/postgres" ] && [ -x "$1/psql" ]
}

# "postgres (PostgreSQL) 15.8 (Ubuntu 15.8-1.pgdg24.04+1)" -> 15
pg_preflight__major() {
  "$1/postgres" --version 2>/dev/null | awk '{ print $3 }' | sed 's/[^0-9].*//'
}

pg_preflight__candidates() {
  local postgres dir
  postgres="$(command -v postgres 2>/dev/null || true)"
  if [ -n "$postgres" ]; then
    dirname "$(realpath "$postgres" 2>/dev/null || echo "$postgres")"
  fi
  # Newest major first, so a machine with 15 and 18 uses 18 unless PG_BIN says otherwise.
  for dir in /usr/lib/postgresql/*/bin /opt/homebrew/opt/postgresql@*/bin /usr/local/opt/postgresql@*/bin; do
    if [ -d "$dir" ]; then
      echo "$(echo "$dir" | sed -E 's#.*postgresql[@/]([0-9]+).*#\1#') $dir"
    fi
  done | sort -rn | cut -d' ' -f2-
  for dir in /opt/homebrew/opt/postgresql/bin /usr/local/opt/postgresql/bin \
    /Applications/Postgres.app/Contents/Versions/latest/bin; do
    if [ -d "$dir" ]; then echo "$dir"; fi
  done
}

pg_preflight__fail() {
  {
    echo "$1"
    echo "These tests need Postgres $PG_MIN_MAJOR or newer: initdb, pg_ctl, postgres and psql in one folder."
    echo "  macOS:  brew install postgresql@15"
    echo "          then: PG_BIN=\"\$(brew --prefix postgresql@15)/bin\" $0"
    echo "  Ubuntu: sudo apt-get install postgresql-15   (Ubuntu 24.04 needs the PGDG apt repository)"
    echo "          then: PG_BIN=/usr/lib/postgresql/15/bin $0"
    echo "Installed somewhere else? Set PG_BIN to the folder that holds initdb and postgres."
  } >&2
  exit 2
}

if [ -n "${PG_BIN:-}" ]; then
  pg_preflight__complete "$PG_BIN" || pg_preflight__fail "PG_BIN=$PG_BIN does not hold initdb, pg_ctl, postgres and psql."
  PG_MAJOR="$(pg_preflight__major "$PG_BIN")"
  [ "${PG_MAJOR:-0}" -ge "$PG_MIN_MAJOR" ] || pg_preflight__fail "PG_BIN=$PG_BIN is Postgres ${PG_MAJOR:-of unknown version}."
else
  pg_preflight__oldest=""
  while IFS= read -r pg_preflight__dir; do
    [ -n "$pg_preflight__dir" ] && pg_preflight__complete "$pg_preflight__dir" || continue
    PG_MAJOR="$(pg_preflight__major "$pg_preflight__dir")"
    if [ "${PG_MAJOR:-0}" -ge "$PG_MIN_MAJOR" ]; then
      PG_BIN="$pg_preflight__dir"
      break
    fi
    pg_preflight__oldest="Found only Postgres ${PG_MAJOR:-of unknown version} in $pg_preflight__dir."
  done < <(pg_preflight__candidates)
  [ -n "${PG_BIN:-}" ] || pg_preflight__fail "${pg_preflight__oldest:-No Postgres server found.}"
fi

export PG_BIN PG_MAJOR
export PATH="$PG_BIN:$PATH"
