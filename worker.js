'use strict';

var Tab = require('chrome-tab')

module.exports = class extends Tab {
  loadUrl (req, cb) {
    this.req = req

    var timeout = setTimeout(() => {
      this.methods = {}
      cb._called = true
      cb(new Error('timed out'))
    }, this.timeout)

    var waitForReady = () => {
      if (cb._called) return
      this.call('Runtime.evaluate', {
        expression: req.readyCheck,
        returnByValue: true
      }, (err, response) => {
        if (cb._called) return
        if (err || !!response.result.value) {
          clearTimeout(timeout)
          this.methods = {}
          cb._called = true
          return cb(err)
        } else {
          setTimeout(waitForReady, req.readyCheckInterval)
        }
      })
    }

    this.methods['Page.loadEventFired'] = waitForReady

    this.call('Page.navigate', { url: req.url }, err => {
      if (cb._called) return
      if (err) {
        clearTimeout(timeout)
        this.methods = {}
        cb._called = true
        return cb(err)
      }
    })
  }

  getHtml (cb) {
    this.call('Runtime.evaluate', {
      expression: this.req.stripJs ? `Array.from(document.querySelectorAll('script')).forEach(script => script.remove());
document.documentElement.outerHTML` : `document.documentElement.outerHTML`,
      returnByValue: true
    }, (err, response) => {
      if (err) return cb(err)
      return cb(null, response.result.value)
    })
  }

  clear () {
    this.call('Page.navigate', { url: 'about:blank' }, err => {})
  }
}
