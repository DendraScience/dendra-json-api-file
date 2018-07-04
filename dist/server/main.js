'use strict';

/**
 * JSON API entry point.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module server/main
 */

// TODO: Configure Winston
const log = require('winston');

process.on('uncaughtException', err => {
  log.error(`An unexpected error occurred\n  ${err.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', err => {
  if (!err) {
    log.error('An unexpected empty rejection occurred');
  } else if (err instanceof Error) {
    log.error(`An unexpected rejection occurred\n  ${err.stack}`);
  } else {
    log.error(`An unexpected rejection occurred\n  ${err}`);
  }
  process.exit(1);
});

// TODO: Handle SIGTERM gracefully for Docker
// SEE: http://joseoncode.com/2014/07/21/graceful-shutdown-in-node-dot-js/
require('./app')(log).then(app => {
  const port = app.get('port');
  const server = app.listen(port);

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', () => {
      log.info('Feathers application started on %s:%s', app.get('host'), port);
      resolve(server);
    });
  });
}).catch(err => {
  log.error(err);
});