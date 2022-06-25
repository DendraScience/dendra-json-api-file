/**
 * Basic sequential queue class that is promise-friendly.
 *
 * @author J. Scott Smith
 * @license BSD-2-Clause-FreeBSD
 * @module lib/seq-queue
 */

const { EventEmitter } = require('events')

class SeqQueue extends EventEmitter {
  constructor() {
    super()

    this.isBusy = false
    this.queue = []
  }

  _next() {
    setImmediate(() => {
      if (!this.queue) return
      if (!this.queue.length) {
        this.isBusy = false
        this.emit('empty')
        return
      }

      const task = this.queue.shift()
      const { done, error, fn } = task
      const ret = fn(done, error)

      if (ret instanceof Promise) Promise.resolve(ret).then(done).catch(error)
    })
  }

  cancel() {
    if (!this.queue) return

    this.queue.forEach(task => task.cancel())
    delete this.queue

    this.emit('cancelled')
  }

  push(fn) {
    if (!this.queue) return

    return new Promise((resolve, reject) => {
      const self = this
      const time = new Date().getTime()

      self.queue.push({
        cancel() {
          resolve()
        },
        done(value) {
          resolve(value)
          self._next()
        },
        error(err) {
          reject(err)
          self._next()
        },
        fn,
        time
      })

      if (!this.isBusy) {
        this.isBusy = true
        self._next()
      }
    })
  }
}

module.exports = {
  SeqQueue
}
