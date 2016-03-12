'use strict';

var Tab = require('chrome-tab')

module.exports = class extends Tab {
  loadUrl (req, cb) {
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
      expression: `Array.prototype.slice.call(document.querySelectorAll('script')).forEach(function (script) {
  script.remove()
});
var contentType = document.contentType
if (contentType === 'text/html') {
  document.documentElement.outerHTML
} else {
  document.body.firstElementChild.innerHTML
}`,
      returnByValue: true
    }, (err, response) => {
      if (err) return cb(err)
      return cb(null, response.result.value)
    })
  }
}
