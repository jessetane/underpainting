var Puppeteer = require('puppeteer')

class Worker {
  constructor (opts = {}) {
    this.timeout = opts.timeout || 15000
  }

  open (cb) {
    var ready = null
    if (!this.browser) {
      ready = Puppeteer.launch().then(b => {
        this.browser = b
        return this.browser.newPage()
      })
    } else {
      ready = this.browser.newPage()
    }
    ready.then(p => {
      this.page = p
      cb()
    }).catch(cb)
  }

  loadUrl (req, cb) {
    this.req = req
    var nextCheck = null
    var timeout = setTimeout(() => {
      clearTimeout(nextCheck)
      cb._called = true
      cb(new Error('timed out'))
    }, this.timeout)
    var waitForReady = () => {
      this.page.evaluate(req.readyCheck).then(res => {
        if (cb._called) return
        if (res) {
          clearTimeout(timeout)
          cb()
        } else {
          nextCheck = setTimeout(waitForReady, req.readyCheckInterval)
        }
      }).catch(err => {
        clearTimeout(timeout)
        clearTimeout(nextCheck)
        cb(err)
      })
    }
    this.page.goto(req.url, { waitUntil: 'networkidle2' }).then(waitForReady).catch(cb)
  }

  getHtml (cb) {
    this.page.evaluate(this.req.stripJs ? `Array.from(document.querySelectorAll('script')).forEach(script => script.remove());
document.documentElement.outerHTML` : `document.documentElement.outerHTML`).then(res => {
      cb(null, res)
    }).catch(cb)
  }

  clear () {
    this.page.goto('about:blank')
  }

  close () {
    if (this.page) {
      this.page.close()
      delete this.page
    }
  }
}

module.exports = Worker
