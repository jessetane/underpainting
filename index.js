var http = require('http')
var qs = require('querystring')
var Tab = require('chrome-tab')
var Worker = require('./worker')

var maxWorkers = process.env.MAX_WORKERS || 5
var requests = []
var available = []
var busy = 0
var titleCheck = `document.querySelector('title').textContent`

if (process.env.CHROME_OWNER !== 'false') {
  Tab.list((err, tabs) => {
    if (err) throw err
    tabs.slice(1).forEach(tab => tab.close())
  })
}

var server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 400
    return res.end('GET only')
  }

  var url = req.url.slice(1)
  var readyCheck = titleCheck
  var readyCheckInterval = 100
  var stripJs = false
  var params = url.split('?')
  if (params.length > 1) {
    url = params[0]
    params = qs.parse(params[1])
    if (params._ready_check_) {
      readyCheck = Buffer(params._ready_check_, 'hex').toString('utf8')
    }
    if (params._ready_check_interval_) {
      readyCheckInterval = parseInt(params._ready_check_interval_, 10)
      if (isNaN(readyCheckInterval)) {
        readyCheckInterval = 100
      }
    }
    if (params._strip_js_ !== undefined) {
      stripJs = true
    }
    delete params._escaped_fragment_
    delete params._ready_check_
    delete params._ready_check_interval_
    delete params._strip_js_
    if (Object.keys(params).length) {
      url = `${url}?${qs.stringify(params)}`
    }
  }

  requests.push({
    res,
    url,
    readyCheck,
    readyCheckInterval,
    stripJs
  })

  work()
})

server.listen(process.env.PORT || '8080', process.env.HOST || '::', (err) => {
  if (err) throw err
  console.log('server listening on', process.env.PORT || '8080')
})

function work () {
  if (requests.length === 0) return
  if (busy >= maxWorkers) return
  var worker = available.shift()
  if (!worker) {
    busy++
    worker = new Worker({
      host: process.env.CHROME_HOST,
      port: process.env.CHROME_PORT,
      timeout: parseInt(process.env.TIMEOUT)
    })
    worker.open(err => {
      if (err) {
        worker.close()
      } else {
        worker.call('Page.enable', err => {})
        available.push(worker)
      }
      busy--
      work()
    })
  } else {
    fetch(worker)
  }
}

function fetch (worker) {
  busy++
  var req = requests.shift()
  worker.loadUrl(req, err => {
    if (err) {
      if (err.message === 'not opened') {
        requests.push(req)
      } else {
        req.res.statusCode = 500
        req.res.end('server error')
        worker.clear()
        available.push(worker)
      }
      busy--
      work()
    } else {
      scrape(worker, req)
    }
  })
}

function scrape (worker, req) {
  worker.getHtml((err, html) => {
    if (err) {
      if (err.message === 'not opened') {
        requests.push(req)
      } else {
        req.res.statusCode = 500
        req.res.end('server error')
        worker.clear()
        available.push(worker)
      }
    } else {
      req.res.end(html)
      worker.clear()
      available.push(worker)
    }
    busy--
    work()
  })
}
