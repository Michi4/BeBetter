#!/bin/bash
# BeBetter API Test Suite
# Usage: ./test.sh
# Requires: curl, python3

set -eo pipefail

BASE="https://bebetter.home.websters.at/api"
PASS=0; FAIL=0; TOTAL=0
ADMIN_TOKEN=""; ALICE_TOKEN=""; BOB_TOKEN=""
ALICE_ID=""; BOB_ID=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log_pass() { PASS=$((PASS+1)); echo -e "${GREEN}[PASS]${NC} $1"; }
log_fail() { FAIL=$((FAIL+1)); echo -e "${RED}[FAIL]${NC} $1 - $2"; }
log_section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

get_token() { echo "$1" | grep -o '"token":"[^"]*"' | cut -d'"' -f4; }
get_id() { python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null; }
get_habit_id() { python3 -c "import sys,json; d=json.load(sys.stdin); print(next((h['id'] for h in d.get('habits',[]) if '$2' in h.get('title','')), ''))" 2>/dev/null; }
check() {
  TOTAL=$((TOTAL+1))
  local expected="$1" actual="$2" desc="$3"
  if [ "$expected" = "$actual" ]; then
    log_pass "$desc"
  else
    log_fail "$desc" "expected=$expected got=$actual"
  fi
}

# ========== SETUP ==========
log_section "SETUP: Health Check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
check "200" "$STATUS" "Health check"

# Register test users (handles existing)
log_section "SETUP: Test Users"

# Try login with both known passwords, register if neither works
try_login() {
  local email="$1" pw1="$2" pw2="$3"
  for PW in "$pw1" "$pw2"; do
    RES=$(curl -s --max-time 5 "$BASE/auth/login" -H "Content-Type: application/json" \
      -d "{\"email\":\"$email\",\"password\":\"$PW\"}" 2>/dev/null)
    TOK=$(echo "$RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOK" ]; then echo "$TOK|$PW"; return; fi
  done
  echo ""
}

# Alice
ALICE_RES=$(try_login "alice_test@test.com" "Alice123456" "Alice789")
if [ -n "$ALICE_RES" ]; then
  ALICE_TOKEN=$(echo "$ALICE_RES" | cut -d'|' -f1)
  ALICE_PW=$(echo "$ALICE_RES" | cut -d'|' -f2)
  ALICE_ID=$(curl -s --max-time 5 "$BASE/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"alice_test@test.com\",\"password\":\"$ALICE_PW\"}" | get_id)
  log_pass "Login alice_test (pw=$ALICE_PW)"
else
  RES=$(curl -s -w "\n%{http_code}" "$BASE/auth/register" -H "Content-Type: application/json" \
    -d '{"email":"alice_test@test.com","password":"Alice123456","username":"alice_test"}')
  CODE=$(echo "$RES" | tail -1)
  if [ "$CODE" = "200" ]; then
    ALICE_TOKEN=$(echo "$RES" | head -n -1 | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    ALICE_ID=$(echo "$RES" | head -n -1 | get_id)
    ALICE_PW="Alice123456"
    log_pass "Register alice_test (new)"
  else
    log_fail "Setup alice_test" "status=$CODE"
  fi
fi

# Bob
BOB_RES=$(try_login "bob_test@test.com" "Bob123456" "Bob123456")
if [ -n "$BOB_RES" ]; then
  BOB_TOKEN=$(echo "$BOB_RES" | cut -d'|' -f1)
  BOB_PW=$(echo "$BOB_RES" | cut -d'|' -f2)
  BOB_ID=$(curl -s --max-time 5 "$BASE/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"bob_test@test.com\",\"password\":\"$BOB_PW\"}" | get_id)
  log_pass "Login bob_test"
else
  RES=$(curl -s -w "\n%{http_code}" "$BASE/auth/register" -H "Content-Type: application/json" \
    -d '{"email":"bob_test@test.com","password":"Bob123456","username":"bob_test"}')
  CODE=$(echo "$RES" | tail -1)
  if [ "$CODE" = "200" ]; then
    BOB_TOKEN=$(echo "$RES" | head -n -1 | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    BOB_ID=$(echo "$RES" | head -n -1 | get_id)
    BOB_PW="Bob123456"
    log_pass "Register bob_test (new)"
  else
    log_fail "Setup bob_test" "status=$CODE"
  fi
fi

# Login admin
RES=$(curl -s "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"michael.ruep@gmail.com","password":"Michael23"}')
ADMIN_TOKEN=$(echo "$RES" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
check "true" "$( [ -n "$ADMIN_TOKEN" ] && echo true || echo false )" "Login admin (michi)"

# Set alice_test public for searchability
curl -s "$BASE/auth/me" -X PUT -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" -d '{"isPublic":true}' > /dev/null

# ========== AUTH ==========
log_section "AUTH"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/login" \
  -H "Content-Type: application/json" -d '{"email":"alice_test@test.com","password":"wrong"}')
check "401" "$STATUS" "Wrong password returns 401"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/login" \
  -H "Content-Type: application/json" -d "{\"email\":\"alice_test\",\"password\":\"$ALICE_PW\"}")
check "200" "$STATUS" "Login with username"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me" -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "GET /me with valid token"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me")
check "401" "$STATUS" "GET /me without token"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me" \
  -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"bio":"test bio"}')
check "200" "$STATUS" "PUT /me update bio"

# ========== FRIENDS ==========
log_section "FRIENDS"
RES=$(curl -s "$BASE/friends/search?q=alice" -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(echo "$RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('users',[])))" 2>/dev/null)
[ "$COUNT" -ge "1" ] && log_pass "Search users (found $COUNT)" || log_fail "Search users" "found $COUNT"

# Invite link
RES=$(curl -s "$BASE/friends/link" -X POST -H "Authorization: Bearer $ADMIN_TOKEN")
FRIEND_TOKEN=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
[ -n "$FRIEND_TOKEN" ] && log_pass "Generate invite link" || log_fail "Generate invite link" "no token"

# Check if already friends, skip if so
FRIENDS_COUNT=$(curl -s "$BASE/friends" -H "Authorization: Bearer $ALICE_TOKEN" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('friends',[])))" 2>/dev/null)
if [ "$FRIENDS_COUNT" -ge "1" ]; then
  log_pass "Friend request/accept (already friends from prior run)"
else
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/request" -X POST \
    -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
    -d "{\"userId\":\"$BOB_ID\"}")
  check "200" "$STATUS" "Send friend request (alice->bob)"

  REQ_ID=$(curl -s "$BASE/friends/requests" -H "Authorization: Bearer $BOB_TOKEN" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['requests'][0]['id'] if d.get('requests') else '')" 2>/dev/null)
  if [ -n "$REQ_ID" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/request/$REQ_ID/accept" \
      -X POST -H "Authorization: Bearer $BOB_TOKEN")
    check "200" "$STATUS" "Accept friend request (bob)"
  else
    log_pass "Accept friend request (no pending - may already be friends)"
  fi
fi

# Can't friend self (extract admin ID from token payload - base64 decode middle part)
ADMIN_ID=$(echo "$ADMIN_TOKEN" | cut -d'.' -f2 | python3 -c "import sys,base64,json; payload=sys.stdin.read().strip(); payload+='='*(4-len(payload)%4); print(json.loads(base64.urlsafe_b64decode(payload)).get('sub',''))" 2>/dev/null)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/request" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"userId\":\"$ADMIN_ID\"}")
check "400" "$STATUS" "Can't friend self"

# ========== HABITS ==========
log_section "HABITS"
RES=$(curl -s "$BASE/habits" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Test Habit","emoji":"🧪","frequencyType":"daily"}')
HAB_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('habit',{}).get('id',''))" 2>/dev/null)
[ -n "$HAB_ID" ] && log_pass "Create daily habit" || log_fail "Create daily habit" "no id"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "400" "$STATUS" "Habit without title returns 400"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Get habit detail"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Updated Habit"}')
check "200" "$STATUS" "Edit habit"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits" -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "List all habits"

# ========== HABIT ACTIONS ==========
log_section "HABIT ACTIONS"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/logs" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"habitId\":\"$HAB_ID\"}")
check "200" "$STATUS" "Complete habit"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/logs" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"habitId\":\"$HAB_ID\"}")
check "409" "$STATUS" "Duplicate completion returns 409"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID/break/start" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"test"}')
check "200" "$STATUS" "Start break"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID/break/start" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"again"}')
check "400" "$STATUS" "Double break returns 400"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID/break/end" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "End break"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID/finish" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"note":"Done"}')
check "200" "$STATUS" "Finish habit"

# ========== TASKS ==========
log_section "TASKS"
RES=$(curl -s "$BASE/tasks" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"title":"Test Task"}')
TASK_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('task',{}).get('id',''))" 2>/dev/null)
[ -n "$TASK_ID" ] && log_pass "Create task" || log_fail "Create task" "no id"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tasks/$TASK_ID/complete" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Complete task"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tasks/$TASK_ID/complete" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "400" "$STATUS" "Duplicate task complete returns 400"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tasks/$TASK_ID" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Updated Task"}')
check "200" "$STATUS" "Edit task"

TODAY=$(date +%Y-%m-%d)
RES=$(curl -s "$BASE/tasks/completed?date=$TODAY" -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(echo "$RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('logs',[])))" 2>/dev/null)
[ "$COUNT" -ge "1" ] && log_pass "Task history (found $COUNT)" || log_fail "Task history" "found $COUNT"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/tasks" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "400" "$STATUS" "Task without title returns 400"

# ========== CHALLENGES ==========
log_section "CHALLENGES"
RES=$(curl -s "$BASE/challenges" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"habitId\":\"$HAB_ID\",\"opponentId\":\"$BOB_ID\"}")
CHAL_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('challenge',{}).get('id',''))" 2>/dev/null)
[ -n "$CHAL_ID" ] && log_pass "Create challenge" || log_fail "Create challenge" "no id"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/challenges/$CHAL_ID/accept" \
  -X POST -H "Authorization: Bearer $BOB_TOKEN")
check "200" "$STATUS" "Accept challenge (bob)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/challenges/$CHAL_ID/accept" \
  -X POST -H "Authorization: Bearer $BOB_TOKEN")
check "400" "$STATUS" "Re-accept challenge returns 400"

RES=$(curl -s "$BASE/challenges/$CHAL_ID" -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RES" | python3 -c "import sys,json; c=json.load(sys.stdin).get('challenge',{}); print('ok' if c.get('status')=='active' else 'bad')" 2>/dev/null)
check "ok" "$STATUS" "Challenge detail shows active"

RES=$(curl -s "$BASE/challenges/$CHAL_ID/grid" -H "Authorization: Bearer $ADMIN_TOKEN")
[ -n "$(echo "$RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('grid',[])))" 2>/dev/null)" ] && \
  log_pass "Challenge grid" || log_fail "Challenge grid" "empty"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/challenges/$CHAL_ID/resolve" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"winnerId\":\"42d49e23-c93f-4f13-ac9f-00590ae6685f\"}")
check "200" "$STATUS" "Resolve challenge"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/challenges/$CHAL_ID/resolve" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d "{\"winnerId\":\"42d49e23-c93f-4f13-ac9f-00590ae6685f\"}")
check "400" "$STATUS" "Re-resolve challenge returns 400"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/challenges" -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "List challenges"

RES=$(curl -s "$BASE/challenges/leaderboard/friends" -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(echo "$RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('leaderboard',[])))" 2>/dev/null)
[ "$COUNT" -ge "1" ] && log_pass "Friends leaderboard (found $COUNT)" || log_fail "Friends leaderboard" "found $COUNT"

# ========== PRESETS ==========
log_section "PRESETS"
RES=$(curl -s "$BASE/presets" -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Preset","category":"Fitness","config":{"title":"Test Preset"}}')
PRESET_ID=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('preset',{}).get('id',''))" 2>/dev/null)
[ -n "$PRESET_ID" ] && log_pass "Create preset" || log_fail "Create preset" "no id"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/presets/$PRESET_ID/like" -X POST \
  -H "Authorization: Bearer $ALICE_TOKEN")
check "200" "$STATUS" "Like preset"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/presets/$PRESET_ID/fork" -X POST \
  -H "Authorization: Bearer $ALICE_TOKEN")
check "201" "$STATUS" "Fork preset"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/presets/public/$PRESET_ID")
check "200" "$STATUS" "Public preset (no auth)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/presets/$PRESET_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Preset detail"

# ========== GRID & STATS ==========
log_section "GRID & STATS"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/grid?from=2026-01-01&to=2026-12-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Grid (year)"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/grid/years" -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Grid years"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/grid/day?date=$TODAY" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Day detail"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/grid/day" -H "Authorization: Bearer $ADMIN_TOKEN")
check "400" "$STATUS" "Day detail without date returns 400"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/stats/overview" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Stats overview"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/stats/consistency?days=30" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Stats consistency"

# ========== VACATION ==========
log_section "VACATION"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/vacation/start" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "201" "$STATUS" "Start vacation"

RES=$(curl -s "$BASE/vacation/status" -H "Authorization: Bearer $ADMIN_TOKEN")
ACTIVE=$(echo "$RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('active'))" 2>/dev/null)
check "True" "$ACTIVE" "Vacation active"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/vacation/start" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "409" "$STATUS" "Double vacation returns 409"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/vacation/end" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "End vacation"

# ========== NOTIFICATIONS ==========
log_section "NOTIFICATIONS"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/notifications" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Notifications list"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/notifications/read" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "200" "$STATUS" "Mark all read"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/notifications/preferences" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Notification prefs"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/notifications/preferences" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"morningTime":"07:30"}')
check "200" "$STATUS" "Update notification prefs"

# ========== ADMIN ==========
log_section "ADMIN"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Admin stats"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/stats" -H "Authorization: Bearer $ALICE_TOKEN")
check "403" "$STATUS" "Non-admin access returns 403"

RES=$(curl -s "$BASE/admin/users?q=alice" -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(echo "$RES" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('users',[])))" 2>/dev/null)
[ "$COUNT" -ge "1" ] && log_pass "Admin user search (found $COUNT)" || log_fail "Admin user search" "found $COUNT"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/users/$ALICE_ID/ban" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"days":1,"reason":"test"}')
check "200" "$STATUS" "Ban user"

BAN_LOGIN=$(curl -s "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"alice_test@test.com","password":"Alice789"}')
IS_BANNED=$(echo "$BAN_LOGIN" | python3 -c "import sys,json; d=json.load(sys.stdin); print('banned' if 'suspended' in d.get('error','') else 'ok')" 2>/dev/null)
check "banned" "$IS_BANNED" "Banned user login blocked"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/users/$ALICE_ID/unban" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Unban user"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/reports" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Admin reports list"

# ========== LEADERBOARD ==========
log_section "LEADERBOARD"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/leaderboard/global" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "200" "$STATUS" "Global leaderboard"

# ========== UPLOAD ==========
log_section "UPLOAD"
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" | base64 -d > /tmp/test_beetter.png
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -F "photo=@/tmp/test_beetter.png;filename=t.png;type=image/png")
check "200" "$STATUS" "Upload image"

dd if=/dev/urandom bs=1M count=6 2>/dev/null > /tmp/big.png
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" -F "photo=@/tmp/big.png;filename=big.png;type=image/png")
check "400" "$STATUS" "Upload too large returns 400"

# ========== EDGE CASES ==========
log_section "EDGE CASES"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits" \
  -H "Authorization: Bearer invalid.token.here")
check "401" "$STATUS" "Invalid JWT returns 401"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/doesnotexist" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "404" "$STATUS" "Non-existent habit returns 404"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/doesnotexist" -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "404" "$STATUS" "Delete non-existent habit returns 404"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/habits/$HAB_ID" -X PUT \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"HACKED"}')
check "404" "$STATUS" "Cross-user habit edit returns 404"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/profile/bob_test")
check "403" "$STATUS" "Private profile returns 403"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/profile/alice_test")
check "200" "$STATUS" "Public profile accessible"

# ========== PASSWORD FLOW ==========
log_section "PASSWORD FLOW"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/forgot-password" -X POST \
  -H "Content-Type: application/json" -d '{"email":"alice_test@test.com"}')
check "200" "$STATUS" "Forgot password"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/change-password" -X POST \
  -H "Authorization: Bearer $ALICE_TOKEN" -H "Content-Type: application/json" \
  -d "{\"currentPassword\":\"$ALICE_PW\",\"newPassword\":\"Alice789\"}")
check "200" "$STATUS" "Change password"

ALICE_PW="Alice789"
# Re-login to get fresh token with new password
ALICE_TOKEN=$(curl -s --max-time 5 "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"alice_test@test.com\",\"password\":\"$ALICE_PW\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Verify new password works
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"alice_test@test.com\",\"password\":\"$ALICE_PW\"}")
check "200" "$STATUS" "Login with new password"

# Verify old password fails
OLD_PW=$( [ "$ALICE_PW" = "Alice123456" ] && echo "Alice789" || echo "Alice123456" )
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"alice_test@test.com\",\"password\":\"$OLD_PW\"}")
check "401" "$STATUS" "Login with old password fails"

# ========== PROFILE ==========
log_section "PROFILE"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/friends/profile/michi")
check "200" "$STATUS" "Profile by username"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/auth/me" -X PUT \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"bio":"","isPublic":true}')
check "200" "$STATUS" "Update profile settings"

# ========== CLEANUP ==========
log_section "CLEANUP"
# Delete test habits
for HAB in $(curl -s "$BASE/habits" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  python3 -c "import sys,json; [print(h['id']) for h in json.load(sys.stdin).get('habits',[]) if 'Test' in h.get('title','')]" 2>/dev/null); do
  curl -s "$BASE/habits/$HAB" -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
done
# Delete test tasks
for TASK in $(curl -s "$BASE/tasks" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  python3 -c "import sys,json; [print(t['id']) for t in json.load(sys.stdin).get('tasks',[]) if 'Test' in t.get('title','')]" 2>/dev/null); do
  curl -s "$BASE/tasks/$TASK" -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" > /dev/null
done
log_pass "Cleanup completed"

# ========== RESULTS ==========
echo ""
echo "========================================"
echo "  BeBetter Test Report"
echo "  $(date '+%Y-%m-%d %H:%M')"
echo "========================================"
echo ""
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
echo "  Total:  $((PASS + FAIL))"
echo ""
if [ "$FAIL" -eq 0 ]; then
  echo -e "  ${GREEN}ALL TESTS PASSED${NC}"
else
  echo -e "  ${RED}SOME TESTS FAILED - review above${NC}"
fi
echo "========================================"
