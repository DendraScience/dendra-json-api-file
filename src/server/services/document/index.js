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
const mkdir = util.promisify(fs.mkdir)
const readdir = util.promisify(fs.readdir)
const readFile = util.promisify(fs.readFile)
const stat = util.promisify(fs.stat)
const unlink = util.promisify(fs.unlink)
const writeFile = util.promisify(fs.writeFile)

const { DOCUMENT_FILE_REGEX } = require('../../lib/consts')
const { parseCategoryId, parseDocumentId } = require('../../lib/parse')
const { SeqQueue } = require('../../lib/seq-queue')

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
    this._queues = {}
    this.basePath = options.basePath
  }

  _queue(id) {
    let queue = this._queues[id]

    if (!queue) {
      queue = this._queues[id] = new SeqQueue()

      queue.once('empty', () => {
        delete this._queues[id]
      })
    }

    return queue
  }

  async _find(params = {}) {
    const { query, filters, paginate } = this.filterQuery(params)

    let p = {
      categoryPath: this.basePath
    }
    if (typeof query.category_id === 'string') {
      p = parseCategoryId(query.category_id, this.basePath)
      delete query.category_id
    } else if (typeof query._id === 'string') {
      p = parseDocumentId(query._id, this.basePath)
    }

    let values = []
    let files = []

    try {
      files = await readdir(p.categoryPath)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }

    for (const name of files) {
      if (!DOCUMENT_FILE_REGEX.test(name)) continue

      const stats = await stat(path.join(p.categoryPath, name))
      const value = {}

      if (name.endsWith('.json')) {
        value[this.id] = name.substr(0, name.length - 5)
        value.is_compressed = false
      }

      if (value[this.id]) {
        if (p.categoryId) {
          value[this.id] = `${p.categoryId}-${value[this.id]}`
          value.category_id = p.categoryId
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

  async _getValue(p) {
    const stats = await stat(p.documentPath)

    const value = {
      [this.id]: p.documentId,
      is_compressed: false
    }

    if (p.categoryId.length) value.category_id = p.categoryId

    value.content = JSON.parse(await readFile(p.documentPath, 'utf8'))
    value.created_at = stats.ctime
    value.updated_at = stats.mtime

    return value
  }

  async _get(id, params = {}) {
    const p = parseDocumentId(id, this.basePath)

    return this._queue(p.documentId).push(async () => {
      const { query } = this.filterQuery(params)

      let value
      try {
        value = await this._getValue(p)
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
        throw new errors.NotFound(`No record found for id '${id}'`)
      }

      if (this.options.matcher(query)(value)) {
        return _select(value, params, this.id)
      }

      throw new errors.NotFound(`No record found for id '${id}'`)
    })
  }

  async _create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current, params)))
    }

    const p = parseDocumentId(data[this.id], this.basePath)

    return this._queue(p.documentId).push(async () => {
      for (let i = 0; i < p.categoryParts.length; i++) {
        try {
          await mkdir(
            path.join(this.basePath, ...p.categoryParts.slice(0, i + 1))
          )
        } catch (err) {
          if (err.code !== 'EEXIST') throw err
        }
      }

      const content = data.content || {}

      await writeFile(p.documentPath, JSON.stringify(content))

      const result = await this._getValue(p)
      return _select(result, params, this.id)
    })
  }

  async _remove(id, params = {}) {
    const p = parseDocumentId(id, this.basePath)

    return this._queue(p.documentId).push(async () => {
      const { query } = this.filterQuery(params)

      let value
      try {
        value = await this._getValue(p)
      } catch (err) {
        if (err.code !== 'ENOENT') throw err
        throw new errors.NotFound(`No record found for id '${id}'`)
      }

      if (this.options.matcher(query)(value)) {
        await unlink(p.documentPath)
        return _select(value, params, this.id)
      }

      throw new errors.NotFound(`No record found for id '${id}'`)
    })
  }
}

module.exports = function (app) {
  const stores = app.get('stores')

  if (!stores.file) return

  const { basePath, paginate } = stores.file

  app.use(
    '/documents',
    new Service({
      basePath,
      paginate
    })
  )

  // Get the wrapped service object, bind hooks
  const documentService = app.service('/documents')

  documentService.hooks(hooks)
}
