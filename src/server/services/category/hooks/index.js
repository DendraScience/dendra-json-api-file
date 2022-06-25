const errors = require('@feathersjs/errors')
const { disallow, getByDot } = require('feathers-hooks-common')

const { OBJECT_ID_REGEX } = require('../../../lib/consts')

exports.before = {
  // all: [],

  find: [
    // NOTE: Normally included here, but we don't want to coerce _id and parent_category_id
    // apiHooks.coerceQuery(),

    context => {
      const id = getByDot(context, 'params.query._id')
      if (typeof id === 'string' && !OBJECT_ID_REGEX.test(id)) {
        throw new errors.BadRequest('Invalid _id parameter')
      }

      const parentCategoryId = getByDot(
        context,
        'params.query.parent_category_id'
      )
      if (
        typeof parentCategoryId === 'string' &&
        !OBJECT_ID_REGEX.test(parentCategoryId)
      ) {
        throw new errors.BadRequest('Invalid parent_category_id parameter')
      }
    }
  ],

  get: [
    context => {
      const id = context.id
      if (typeof id !== 'string' || !OBJECT_ID_REGEX.test(id)) {
        throw new errors.BadRequest('Invalid _id parameter')
      }
    }
  ],

  create: disallow(),
  update: disallow(),
  patch: disallow(),
  remove: disallow()
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
