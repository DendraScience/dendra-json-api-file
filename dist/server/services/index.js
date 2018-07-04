'use strict';

const path = require('path');

module.exports = function (app) {
  const names = ['category', 'document'];

  names.forEach(name => app.configure(require(path.join(__dirname, name))));
};