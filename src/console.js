// wraper console.xxx() to add prefix
const prefix = 'NflxMultiSubs>';
const safe = args => args.map(value => value instanceof Error ? `[${value.name}]` : value);
const console = {
  log: (...args) => window.console.log(prefix, ...safe(args)),
  warn: (...args) => window.console.warn(prefix, ...safe(args)),
  error: (...args) => window.console.error(prefix, ...safe(args)),
  debug: (...args) => window.console.debug(prefix, ...safe(args)),
};

module.exports = console;
