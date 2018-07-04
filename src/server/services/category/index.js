const errors = require('@feathersjs/errors')
const {sorter, select, filterQuery} = require('@feathersjs/commons')
const sift = require('sift')

const fs = require('fs')
const path = require('path')
const util = require('util')
const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)

const {CATEGORY_FILE_REGEX} = require('../../lib/consts')
const {parseCategoryId, parseParentCategoryId} = require('../../lib/parse')

const hooks = require('./hooks')

class Service {
  constructor (options = {}) {
    this.basePath = options.basePath
    this.paginate = options.paginate || {}
    this.id = options.id || '_id'
    this._matcher = options.matcher
    this._sorter = options.sorter || sorter
  }

  async _find (params, getFilter = filterQuery) {
    const {query, filters} = getFilter(params.query || {})
    const map = select(params)

    let p = {
      parentCategoryPath: this.basePath
    }

    if (typeof query.parent_category_id === 'string') {
      p = parseParentCategoryId(query.parent_category_id, this.basePath)
      delete query.parent_category_id
    } else if (typeof query[this.id] === 'string') {
      p = parseCategoryId(query[this.id], this.basePath)
    }

    let values = []
    let files = []

    try {
      files = await readdir(p.parentCategoryPath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }

    for (let name of files) {
      if (!CATEGORY_FILE_REGEX.test(name)) continue

      const stats = await stat(path.join(p.parentCategoryPath, name))
      const item = {
        [this.id]: name
      }

      if (stats.isDirectory()) {
        if (p.parentCategoryId) {
          item[this.id] = `${p.parentCategoryId}-${item[this.id]}`
          item.parent_category_id = p.parentCategoryId
        }

        item.created_at = stats.ctime
        item.updated_at = stats.mtime

        values.push(item)
      }
    }

    if (this._matcher) {
      values = values.filter(this._matcher(query))
    } else {
      values = sift(query, values)
    }

    const total = values.length

    if (filters.$sort) {
      values.sort(this._sorter(filters.$sort))
    }

    if (filters.$skip) {
      values = values.slice(filters.$skip)
    }

    if (typeof filters.$limit !== 'undefined') {
      values = values.slice(0, filters.$limit)
    }

    return {
      total,
      limit: filters.$limit,
      skip: filters.$skip || 0,
      data: map(values)
    }
  }

  find (params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate
    const result = this._find(params, query => filterQuery(query, paginate))

    if (!(paginate && paginate.default)) {
      return result.then(page => page.data)
    }

    return result
  }

  get (id, params) {
    const p = parseCategoryId(id, this.basePath)

    return stat(p.categoryPath).then(stats => {
      const item = {}

      item[this.id] = p.categoryId

      if (p.parentCategoryId.length) item.parent_category_id = p.parentCategoryId

      item.created_at = stats.ctime
      item.updated_at = stats.mtime

      return select(params, this.id)(item)
    }).catch(err => {
      if (err.code !== 'ENOENT') throw err
      throw new errors.NotFound(`No record found for id '${id}'`)
    })
  }
}

module.exports = function (app) {
  const stores = app.get('stores')

  if (!stores.file) return

  const {basePath, paginate} = stores.file

  app.use('/categories', new Service({
    basePath,
    paginate
  }))

  // Get the wrapped service object, bind hooks
  const categoryService = app.service('/categories')

  categoryService.hooks(hooks)
}
