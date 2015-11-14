var http = require('app-server')
var spawn = require('child_process').spawn

var MAX_WORKERS = process.env.MAX_WORKERS || 5
var RETIREMENT_AGE = process.env.RETIREMENT_AGE || 25
var PHANTOMJS = process.env.PHANTOMJS || 'phantomjs'

var jobs = []
var workers = []
var busy = 0
var titleCheck = "function titleCheck () { return document.querySelector('title').textContent }"

var server = http(function (err) {
  if (err) throw err
  console.log('server listening on ' + server.port)
})

server.middleware = function (req, res) {
  if (req.method !== 'GET') {
    res.statusCode = 400
    return res.end('GET only')
  } else if (!/^\/http/.test(req.url)) {
    res.statusCode = 400
    return res.end('pathname must contain an HTTP url')
  }

  var readyCheck = req.url.match(/_ready_check_=([^&]*)/)
  if (readyCheck) {
    readyCheck = decodeURIComponent(readyCheck[1])
    req.url = req.url.replace(/_ready_check_=[^&]*[&]?/, '')
  } else {
    readyCheck = titleCheck
  }

  var url = req.url.slice(1).replace('_escaped_fragment_', '')
  jobs.push({
    url: url,
    res: res,
    readyCheck: readyCheck
  })

  work()
}

function work () {
  if (!jobs.length) return
  var worker = catchWorker()
  if (!worker) return
  var job = jobs.shift()
  worker.res = job.res
  worker.stdin.write(job.url + '\n' + job.readyCheck + '\n')
}

function spawnWorker () {
  var worker = spawn(PHANTOMJS, [
    __dirname + '/phantom-server.js'
  ])
  worker.stdout.on('data', onstdout.bind(worker))
  worker.stderr.on('data', onstderr.bind(worker))
  worker.on('exit', onexit.bind(worker))
  worker.age = 0
  return worker
}

function catchWorker () {
  var worker = workers.shift()
  if (!worker && busy < MAX_WORKERS) {
    worker = spawnWorker()
  }
  if (worker) busy++
  return worker
}

function releaseWorker (worker) {
  delete worker.awaiting
  delete worker.received
  delete worker.res
  if (++worker.age < RETIREMENT_AGE) {
    workers.push(worker)
  } else {
    worker.kill('SIGTERM')
  }
  busy--
  work()
}

function onstdout (data) {
  if (!this.res) {
    console.error(data.toString())
    this.kill('SIGTERM')
    return
  } else if (!this.awaiting) {
    var sp = data.indexOf(' ')
    this.awaiting = parseInt(data.slice(0, sp))
    if (isNaN(this.awaiting)) {
      this.res.statusCode = 500
      this.res.end(data)
      releaseWorker(this)
      return
    } else {
      data = data.slice(sp + 1)
      sp = data.indexOf(' ')
      this.res.statusCode = data.slice(0, sp)
      data = data.slice(sp + 1)
      this.received = ''
    }
  }
  this.received += data
  if (this.received.length < this.awaiting) return
  this.res.end(this.received)
  releaseWorker(this)
}

function onstderr (data) {
  if (!this.res) {
    console.error(data.toString())
    this.kill('SIGTERM')
    return
  }
  var sp = data.indexOf(' ')
  this.res.statusCode = data.slice(0, sp)
  this.res.end(data.slice(sp + 1))
  releaseWorker(this)
}

function onexit (status) {
  workers = workers.filter(function (worker) {
    return worker !== this
  }.bind(this))
}
