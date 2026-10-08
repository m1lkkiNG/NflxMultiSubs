const webpack = require('webpack');
const config = require('../webpack.config');

webpack(config, (err, stats) => {
  if (err) {
    console.error(err.stack || err);
    err.details && console.error(err.details);
    process.exitCode = 1;
    return;
  }

  console.log(stats.toString({ colors: true }));
  if (stats.hasErrors()) process.exitCode = 1;
});
