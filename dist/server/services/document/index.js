'use strict';

const errors = require('@feathersjs/errors');
const { sorter, select, filterQuery } = require('@feathersjs/commons');
const sift = require('sift');

const fs = require('fs');
const path = require('path');
const util = require('util');
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);

const { DOCUMENT_FILE_REGEX } = require('../../lib/consts');
const { parseCategoryId, parseDocumentId } = require('../../lib/parse');
const { SeqQueue } = require('../../lib/seq-queue');

const hooks = require('./hooks');

class Service {
  constructor(options = {}) {
    this.basePath = options.basePath;
    this.paginate = options.paginate || {};
    this.id = options.id || '_id';
    this._matcher = options.matcher;
    this._sorter = options.sorter || sorter;
    this._queues = {};
  }

  _queue(id) {
    let queue = this._queues[id];

    if (!queue) {
      queue = this._queues[id] = new SeqQueue();

      queue.once('empty', () => {
        delete this._queues[id];
      });
    }

    return queue;
  }

  async _find(params, getFilter = filterQuery) {
    const { query, filters } = getFilter(params.query || {});
    const map = select(params);

    let p = {
      categoryPath: this.basePath
    };

    if (typeof query.category_id === 'string') {
      p = parseCategoryId(query.category_id, this.basePath);
      delete query.category_id;
    } else if (typeof query._id === 'string') {
      p = parseDocumentId(query._id, this.basePath);
    }

    let values = [];
    let files = [];

    try {
      files = await readdir(p.categoryPath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    for (let name of files) {
      if (!DOCUMENT_FILE_REGEX.test(name)) continue;

      const stats = await stat(path.join(p.categoryPath, name));
      const item = {};

      if (name.endsWith('.json')) {
        item[this.id] = name.substr(0, name.length - 5);
        item.is_compressed = false;
      }

      if (item[this.id]) {
        if (p.categoryId) {
          item[this.id] = `${p.categoryId}-${item[this.id]}`;
          item.category_id = p.categoryId;
        }

        item.created_at = stats.ctime;
        item.updated_at = stats.mtime;

        values.push(item);
      }
    }

    if (this._matcher) {
      values = values.filter(this._matcher(query));
    } else {
      values = sift(query, values);
    }

    const total = values.length;

    if (filters.$sort) {
      values.sort(this._sorter(filters.$sort));
    }

    if (filters.$skip) {
      values = values.slice(filters.$skip);
    }

    if (typeof filters.$limit !== 'undefined') {
      values = values.slice(0, filters.$limit);
    }

    return {
      total,
      limit: filters.$limit,
      skip: filters.$skip || 0,
      data: map(values)
    };
  }

  find(params) {
    const paginate = typeof params.paginate !== 'undefined' ? params.paginate : this.paginate;
    const result = this._find(params, query => filterQuery(query, paginate));

    if (!(paginate && paginate.default)) {
      return result.then(page => page.data);
    }

    return result;
  }

  async _get(p, params) {
    const stats = await stat(p.documentPath);
    const item = {};

    item[this.id] = p.documentId;
    item.is_compressed = false;

    if (p.categoryId.length) item.category_id = p.categoryId;

    item.content = JSON.parse((await readFile(p.documentPath, 'utf8')));
    item.created_at = stats.ctime;
    item.updated_at = stats.mtime;

    await new Promise(resolve => setImmediate(resolve));

    return select(params, this.id)(item);
  }

  get(id, params) {
    const p = parseDocumentId(id, this.basePath);

    return this._queue(p.documentId).push(() => {
      return this._get(p, params);
    }).catch(err => {
      if (err.code !== 'ENOENT') throw err;
      throw new errors.NotFound(`No record found for id '${id}'`);
    });
  }

  _create(data, params) {
    const p = parseDocumentId(data[this.id], this.basePath);

    return this._queue(p.documentId).push(async () => {
      for (let i = 0; i < p.categoryParts.length; i++) {
        try {
          await mkdir(path.join(this.basePath, ...p.categoryParts.slice(0, i + 1)));
        } catch (err) {
          if (err.code !== 'EEXIST') throw err;
        }
      }

      const content = data.content || {};

      await writeFile(p.documentPath, JSON.stringify(content));

      return this._get(p, params);
    });
  }

  create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this._create(current)));
    }

    return this._create(data, params);
  }

  remove(id, params) {
    const p = parseDocumentId(id, this.basePath);

    return this._queue(p.documentId).push(async () => {
      const item = await this._get(p, params);

      await unlink(p.documentPath);

      return item;
    }).catch(err => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
}

module.exports = function (app) {
  const stores = app.get('stores');

  if (!stores.file) return;

  const { basePath, paginate } = stores.file;

  app.use('/documents', new Service({
    basePath,
    paginate
  }));

  // Get the wrapped service object, bind hooks
  const documentService = app.service('/documents');

  documentService.hooks(hooks);
};