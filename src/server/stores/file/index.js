const fs = require('fs')
const path = require('path')
const util = require('util')

const mkdir = util.promisify(fs.mkdir)

module.exports = async (app) => {
  const file = app.get('stores').file
  const basePath = file.basePath = path.resolve(file.path)

  try {
    await mkdir(basePath)
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}
