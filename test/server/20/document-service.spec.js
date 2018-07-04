/**
 * Tests for document service
 */

const fs = require('fs')
const path = require('path')

describe('Service /documents', function () {
  before(function () {
    const stores = app.get('stores')

    if (stores.file) {
      return Promise.resolve(stores.file).then(file => {
        try {
          fs.unlinkSync(path.join(file.basePath, 'aaa', 'bbb', 'ccc.json'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'aaa', 'bbb'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'aaa'))
        } catch (e) {}
      })
    }
  })

  after(function () {
    const stores = app.get('stores')

    if (stores.file) {
      return Promise.resolve(stores.file).then(file => {
        try {
          fs.unlinkSync(path.join(file.basePath, 'aaa', 'bbb', 'ccc.json'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'aaa', 'bbb'))
        } catch (e) {}
        try {
          fs.rmdirSync(path.join(file.basePath, 'aaa'))
        } catch (e) {}
      })
    }
  })

  describe('#create()', function () {
    it('should create without error', function () {
      return guest.service('/documents').create({
        _id: 'aaa-bbb-ccc',
        content: {
          'hello': 'world'
        }
      }).then(doc => {
        expect(doc).to.have.property('_id', 'aaa-bbb-ccc')
        expect(doc).to.have.nested.property('content.hello', 'world')
      })
    })
  })

  describe('#get()', function () {
    it('should get without error', function () {
      return guest.service('/documents').get('aaa-bbb-ccc').then(doc => {
        expect(doc).to.have.property('_id', 'aaa-bbb-ccc')
        expect(doc).to.have.nested.property('content.hello', 'world')
      })
    })
  })

  describe('#find()', function () {
    it('should find without error using id', function () {
      return guest.service('/documents').find({query: {_id: 'aaa-bbb-ccc'}}).then(res => {
        expect(res).to.have.property('data').lengthOf(1)
      })
    })
  })

  describe('#find()', function () {
    it('should find without error using category', function () {
      return guest.service('/documents').find({query: {category_id: 'aaa-bbb'}}).then(res => {
        expect(res).to.have.property('data').lengthOf(1)
      })
    })
  })

  describe('#remove()', function () {
    it('should remove without error', function () {
      return guest.service('/documents').remove('aaa-bbb-ccc').then(doc => {
        expect(doc).to.have.property('_id')
      })
    })
  })
})
