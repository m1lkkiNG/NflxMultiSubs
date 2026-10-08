// Only explicit counters/status codes belong here. Never pass manifest data or URLs.
const state = { version: VERSION, events: [], counts: {} };
function record(stage, detail = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(detail)) {
    if (['count', 'ready', 'skipped', 'cues', 'status', 'ms'].includes(key) &&
        (typeof value === 'number' || typeof value === 'boolean')) safe[key] = value;
  }
  const event = { stage, ...safe };
  state.counts[stage] = (state.counts[stage] || 0) + 1;
  state.events.push(event);
  if (state.events.length > 60) state.events.shift();
  globalThis.console.info('NflxMultiSubs diagnostic:', event);
}
function snapshot() {
  return JSON.parse(JSON.stringify(state));
}
module.exports = { record, snapshot };
