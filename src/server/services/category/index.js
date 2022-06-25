const errors = require('@feathersjs/errors')
const { _ } = require('@feathersjs/commons')
const {
  sorter,
  select,
  AdapterService
} = require('@feathersjs/adapter-commons')
const sift = require('sift').default

const _select = (data, ...args) => {
  const base = select(...args)

  // NOTE: Likely not needed
  // return base(JSON.parse(JSON.stringify(data)))
  return base(data)
}

const fs = require('fs')
const path = require('path')
const util = require('util')
const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)

const { CATEGORY_FILE_REGEX } = require('../../lib/consts')
const { parseCategoryId, parseParentCategoryId } = require('../../lib/parse')

const hooks = require('./hooks')

class Service extends AdapterService {
  constructor(options = {}) {
    super(
      _.extend(
        {
          id: '_id',
          matcher: sift,
          sorter
        },
        options
      )
    )
    this.basePath = options.basePath
  }

  async _find(params = {}) {
    const { query, filters, paginate } = this.filterQuery(params)

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

    for (const name of files) {
      if (!CATEGORY_FILE_REGEX.test(name)) continue

      const stats = await stat(path.join(p.parentCategoryPath, name))
      const value = {
        [this.id]: name
      }

      if (stats.isDirectory()) {
        if (p.parentCategoryId) {
          value[this.id] = `${p.parentCategoryId}-${value[this.id]}`
          value.parent_category_id = p.parentCategoryId
        }

        value.created_at = stats.ctime
        value.updated_at = stats.mtime

        values.push(value)
      }
    }

    values = values.filter(this.options.matcher(query))
    const total = values.length

    if (filters.$sort !== undefined) {
      values.sort(this.options.sorter(filters.$sort))
    }

    if (filters.$skip !== undefined) {
      values = values.slice(filters.$skip)
    }

    if (filters.$limit !== undefined) {
      values = values.slice(0, filters.$limit)
    }

    const result = {
      total,
      limit: filters.$limit,
      skip: filters.$skip || 0,
      data: values.map(value => _select(value, params))
    }

    if (!(paginate && paginate.default)) {
      return result.data
    }

    return result
  }

  async _get(id, params = {}) {
    const p = parseCategoryId(id, this.basePath)

    let stats
    try {
      stats = stat(p.categoryPath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
      throw new errors.NotFound(`No record found for id '${id}'`)
    }

    const { query } = this.filterQuery(params)
    const value = {
      [this.id]: p.categoryId
    }

    if (p.parentCategoryId.length) value.parent_category_id = p.parentCategoryId

    value.created_at = stats.ctime
    value.updated_at = stats.mtime

    if (this.options.matcher(query)(value)) {
      return _select(value, params, this.id)
    }

    throw new errors.NotFound(`No record found for id '${id}'`)
  }
}

module.exports = function (app) {
  const stores = app.get('stores')

  if (!stores.file) return

  const { basePath, paginate } = stores.file

  app.use(
    '/categories',
    new Service({
      basePath,
      paginate
    })
  )

  // Get the wrapped service object, bind hooks
  const categoryService = app.service('/categories')

  categoryService.hooks(hooks)
}
