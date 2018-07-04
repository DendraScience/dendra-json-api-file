const errors = require('@feathersjs/errors')
const {disallow, getByDot} = require('feathers-hooks-common')

const {OBJECT_ID_REGEX} = require('../../../lib/consts')

exports.before = {
  // all: [],

  find: [
    // NOTE: Normally included here, but we don't want to coerce _id and category_id
    // apiHooks.coerceQuery(),

    (hook) => {
      const id = getByDot(hook, 'params.query._id')
      if ((typeof id === 'string') && !OBJECT_ID_REGEX.test(id)) {
        throw new errors.BadRequest('Invalid _id parameter')
      }

      const categoryId = getByDot(hook, 'params.query.category_id')
      if ((typeof categoryId === 'string') && !OBJECT_ID_REGEX.test(categoryId)) {
        throw new errors.BadRequest('Invalid category_id parameter')
      }
    }
  ],

  get (hook) {
    const id = hook.id
    if ((typeof id !== 'string') || !OBJECT_ID_REGEX.test(id)) {
      throw new errors.BadRequest('Invalid _id parameter')
    }
  },

  create (hook) {
    const id = getByDot(hook, 'data._id')
    if ((typeof id !== 'string') || !OBJECT_ID_REGEX.test(id)) {
      throw new errors.BadRequest('Invalid _id field')
    }
  },

  update: disallow(),
  patch: disallow(),

  remove (hook) {
    const id = hook.id
    if ((typeof id !== 'string') || !OBJECT_ID_REGEX.test(id)) {
      throw new errors.BadRequest('Invalid _id parameter')
    }
  }
}

exports.after = {
  // all: [],
  // find [],
  // get: [],
  // create: [],
  // update: [],
  // patch: [],
  // remove: []
}
