// Local-calendar date helpers.
// HabitLog/TaskLog completedAt is stored at LOCAL midnight; deriving day
// strings with toISOString() (UTC) shifts every entry to the previous day
// for timezones east of UTC. All day keys must use local getters instead.

function pad(n) {
  return String(n).padStart(2, '0');
}

// 'YYYY-MM-DD' in the SERVER'S LOCAL calendar
function dayKey(d) {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

// Parse 'YYYY-MM-DD' into a Date at LOCAL midnight (no UTC shifting)
function parseDayKey(s) {
  const parts = s.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Local midnight of an arbitrary Date
function startOfDay(d) {
  const dt = d instanceof Date ? d : new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

module.exports = { dayKey, parseDayKey, startOfDay };