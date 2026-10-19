#!/bin/zsh
# Headless Marketing Studio run (the /marketing-studio skill): drafts a new
# batch of IG carousels and LinkedIn posts into output/marketing/<date>/.
# Drafts only; the skill never posts, sends or spends.
#
#   scripts/marketing-routine.sh
#
# Schedule weekly (Mon 08:52 Bangkok) with `crontab -e`:
#   52 8 * * 1 /Users/bunyasit/dev/pseed/scripts/marketing-routine.sh >> /tmp/marketing-routine.log 2>&1
# Starts its own render server on :3010; needs ../internal checked out.

cd "${0:A:h}/.." || exit 1

scripts/studio-server.sh || { echo "❌ $(date): studio server failed to start" >&2; exit 1; }

claude -p "/marketing-studio Run this week's batch. Follow the skill end to end and finish with the report." \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Glob,Grep,Bash(npx jest:*),Bash(node scripts/render-marketing.mjs:*),Bash(scripts/studio-server.sh:*),Bash(git status:*),Bash(git log:*),Bash(ls:*),Bash(cat:*),Bash(grep:*),Bash(magick:*),Bash(TZ=Asia/Bangkok date:*)"
