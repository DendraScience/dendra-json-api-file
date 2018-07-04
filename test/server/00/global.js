const chai = require('chai')
const path = require('path')

global.assert = chai.assert
global.expect = chai.expect

global.app = require(path.join(__dirname, '../../../dist/server/app.js'))
