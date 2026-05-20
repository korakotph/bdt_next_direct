#!/bin/bash
# Only remind about README if it wasn't part of the last commit
if ! git diff --name-only HEAD~1..HEAD 2>/dev/null | grep -q '^README\.md$'; then
  printf '{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "README.md อัพเดตแล้วหรือยัง? ถ้าการเปลี่ยนแปลงนี้กระทบเนื้อหาใน README.md กรุณาอัพเดตด้วย"}}\n'
fi
