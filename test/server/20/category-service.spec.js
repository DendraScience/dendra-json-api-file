/**
 * Tests for category service
 */

const fs = require('fs')
const path = require('path')

describe('Service /categories', function () {
  before(function () {
    const stores = app.get('stores')

    if (stores.file) {
      return Promise.resolve(stores.file).then(file => {
        try {
          fs.unlinkSync(path.join(file.basePath, 'xxx', 'yyy', 'zzz.json'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'xxx', 'yyy'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'xxx'))
        } catch (e) {}

        return guest.service('/documents').create({
          _id: 'xxx-yyy-zzz'
        })
      })
    }
  })

  after(function () {
    const stores = app.get('stores')

    if (stores.file) {
      return Promise.resolve(stores.file).then(file => {
        try {
          fs.unlinkSync(path.join(file.basePath, 'xxx', 'yyy', 'zzz.json'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'xxx', 'yyy'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'xxx'))
        } catch (e) {}
      })
    }
  })

  describe('#get()', function () {
    it('should get without error', function () {
      return guest
        .service('/categories')
        .get('xxx')
        .then(doc => {
          expect(doc).to.have.property('_id', 'xxx')
        })
    })
  })

  describe('#find()', function () {
    it('should find without error', function () {
      return guest
        .service('/categories')
        .find()
        .then(res => {
          expect(res).to.have.property('data').lengthOf(1)
        })
    })

    it('should find without error using id', function () {
      return guest
        .service('/categories')
        .find({ query: { _id: 'xxx-yyy' } })
        .then(res => {
          expect(res).to.have.property('data').lengthOf(1)
        })
    })

    it('should find without error using parent', function () {
      return guest
        .service('/categories')
        .find({ query: { parent_category_id: 'xxx' } })
        .then(res => {
          expect(res).to.have.property('data').lengthOf(1)
        })
    })
  })
})
