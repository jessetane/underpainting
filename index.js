var http = require('http')
var Worker = require('./worker')

var maxWorkers = process.env.MAX_WORKERS || 5
var requests = []
var available = []
var busy = 0
var titleCheck = `document.querySelector('title').textContent`

var server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 400
    return res.end('GET only')
  }

  var url = req.url.slice(1).replace(/_escaped_fragment_[^&]*/, '')

  var readyCheck = url.match(/_ready_check_=([^&]*)/)
  if (readyCheck) {
    readyCheck = Buffer(readyCheck[1], 'base64').toString()
    url = url.replace(/_ready_check_=[^&]*[&]?/, '')
  } else {
    readyCheck = titleCheck
  }

  var readyCheckInterval = url.match(/_ready_check_interval_=([^&]*)/)
  if (readyCheckInterval) {
    readyCheckInterval = parseInt(readyCheckInterval[1], 10)
    url = url.replace(/_ready_check_interval_=[^&]*[&]?/, '')
  }
  if (isNaN(readyCheckInterval)) {
    readyCheckInterval = 100
  }

  requests.push({
    res: res,
    url: url,
    readyCheck: readyCheck,
    readyCheckInterval: readyCheckInterval
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
      port: process.env.CHROME_PORT
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
        available.push(worker)
      }
    } else {
      req.res.end(html)
      available.push(worker)
    }
    busy--
    work()
  })
}
