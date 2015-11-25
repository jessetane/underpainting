# underpainting
Render HTML on the server that's supposed to be rendered on the client.

## Why
From what I can tell it's still not possible to get decent search results for applications rendered entirely on the client. Google's fetch & render in webmaster tools seems to run JavaScript perfectly well, but the crawler itself must not be doing the same thing. Please correct me if I'm mistaken and / or just doing it rong!

[Prerender](https://github.com/prerender/prerender) is a nice idea for solving the problem, but it seems overly complex and ran my server OOM so I hacked this up instead.

## How
BYO Phantom, talk to it over standard streams. Optionally pass a custom "ready check" function - defaults to `function () { return document.querySelector('title').textContent }`. You can pass it in the querystring base64 encoded under the key `_ready_check_`.

## Example
```bash
$ PHANTOM_JS=/usr/local/bin/phantomjs MAX_WORKERS=5 RETIREMENT_AGE=20 TIMEOUT=5000 node http-server &
$ curl http://keychord.jessetane.com                       # normal
$ curl http://localhost:8080/http://keychord.jessetane.com # prerendered
```

## Configuration
Enviroment variables you can set. Sane (hopefully) defaults are provided but you will probably need to adjust them.

#### `PHANTOM_JS`
You probably want the 2.x branch of PhantomJS, but you also probably won't be able to download it prebuilt for your system. This module isn't about packaging Phantom though so I'll let you figure out how to get a copy on your own. Once obtained, indicate the location of your PhantomJS executable with this variable. Defaults to using your PATH and an executable being called "phantomjs".

#### `MAX_WORKERS`
Phantom is a single threaded beast, so you need a process for each concurrent request you want to handle. You'll probably want to cap the number of workers that can be forked at one time based on the resources you have available. Defaults to 5.

#### `RETIREMENT_AGE`
Phantom seems to have a [leak](https://github.com/ariya/phantomjs/issues/12903)? This means workers need to get retired after a certain age. Nothing fancy here, just spec a `RETIREMENT_AGE` and after a worker has processed that many requests it will be retired (replaced if necessary). Defaults to 20.

#### `TIMEOUT`
The amount of time workers are allowed to spend processing a request is capped. Defaults to 5000 ms.

## Notes
Could this module be fancier? Sure. Should it be? Depends, I'm hoping Google will fix their crawler though.

## License
WTFPL
