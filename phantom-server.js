var system = require('system')
var Page = require('webpage')

serve()

function serve (old) {
  if (old) {
    old.page.stop()
    old.page.close()
    delete old.page
  }

  var req = {
    url: system.stdin.readLine(),
    readyCheck: system.stdin.readLine() || 'function () { return true }',
    page: Page.create()
  }

  req.page.settings.loadImages = false
  req.page.settings.resourceTimeout = 5000
  req.page.onResourceTimeout = ontimeout.bind(req)
  req.page.onResourceReceived = onresource.bind(req)
  req.page.open(req.url, onopen.bind(req))
}

function onresource (response) {
  if (!this.statusCode && !response.redirectURL) {
    this.statusCode = response.status
  }
}

function ontimeout () {
  this.statusCode = 503
  onopen.call(this, 'timed out')
}

function onopen (status) {
  delete this.page.onResourceReceived
  delete this.page.onResourceTimeout
  if (status === 'success') {
    var n = 0
    var checker = setInterval(function () {
      var check = this.page.evaluate(this.readyCheck)
      if (check) {
        clearInterval(checker)
        this.page.evaluate(stripScriptTags)
        system.stdout.write(
          this.page.content.length + ' ' +
          this.statusCode + ' ' +
          this.page.content
        )
        serve(this)
      } else if (++n > 100) {
        clearInterval(checker)
        system.stderr.write('400 bad ready check')
        serve(this)
      }
    }.bind(this), 100)
  } else {
    system.stderr.write((this.statusCode || 400) + ' ' + status)
    serve(this)
  }
}

function stripScriptTags () {
  var scripts = Array.prototype.slice.call(document.querySelectorAll('script'))
  scripts.forEach(function (script) {
    script.remove()
  })
}
