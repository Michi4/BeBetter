// Shared interval-recurrence logic ("every N days").
// Anchor: the habit's creation day. A habit with intervalDays=N is due on days
// where (date - anchorDay) % N === 0. Pure date math — no DB access so both
// routes and the scheduler (and future frontend mirroring) share one truth.

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function calendarDayDiff(a, b) {
  const ms = startOfDay(b) - startOfDay(a);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

// Is `date` a due date for an interval habit anchored at `anchor`?
function isIntervalDueDate(anchor, intervalDays, date) {
  const n = Number(intervalDays);
  if (!Number.isInteger(n) || n < 2) return false;
  if (!anchor) return false;
  const diff = calendarDayDiff(anchor, date);
  if (diff < 0) return false;
  return diff % n === 0;
}

// All due dates of an interval habit inside [from, to] (inclusive), as day keys.
function intervalDueDatesInRange(anchor, intervalDays, from, to) {
  const out = [];
  const n = Number(intervalDays);
  if (!Number.isInteger(n) || n < 2 || !anchor) return out;
  const a = startOfDay(anchor);
  let cur = startOfDay(from);
  // Jump to the first due date >= from.
  const diff = calendarDayDiff(a, cur);
  if (diff > 0) {
    const skip = (n - (diff % n)) % n;
    cur = new Date(cur.getTime() + skip * 24 * 60 * 60 * 1000);
  }
  const end = startOfDay(to);
  while (cur <= end) {
    out.push(cur);
    cur = new Date(cur.getTime() + n * 24 * 60 * 60 * 1000);
  }
  return out;
}

function toDayKey(d) {
  const c = new Date(d);
  return `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
}

function parseJsonArray(val) {
  if (val == null) return [];
  try {
    const arr = typeof val === 'string' ? JSON.parse(val) : val;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// Due predicate for a habit row ({ frequencyType, daysPerWeek, intervalDays,
// createdAt }). Interval recurrence wins when set; otherwise weekday logic.
// Pure date math — vacation/breaks/creation-day checks stay at call sites.
function duePredicateFor(habit) {
  const n = Number(habit && habit.intervalDays);
  if (Number.isInteger(n) && n >= 2 && habit && habit.createdAt) {
    const anchor = habit.createdAt;
    return (date) => isIntervalDueDate(anchor, n, date);
  }
  const ft = habit && habit.frequencyType;
  const sched = parseJsonArray(habit && habit.daysPerWeek);
  return (date) => ft === 'daily' || ft === 'always' || sched.includes(new Date(date).getDay());
}

module.exports = { startOfDay, calendarDayDiff, isIntervalDueDate, intervalDueDatesInRange, toDayKey, parseJsonArray, duePredicateFor };
