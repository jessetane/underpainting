# underpainting
Render HTML on the server that's supposed to be rendered on the client.

## Why
From what I can tell it's still not possible to get decent search results for applications rendered entirely on the client. Google's fetch & render in webmaster tools seems to run JavaScript perfectly well, but the crawler itself must not be doing the same thing. Please correct me if I'm mistaken and / or just doing it rong!

[Prerender](https://github.com/prerender/prerender) is a nice idea for solving the problem, but it seems overly complex and ran my server OOM so I hacked this up instead.

## How
BYO Chromium, talk to it using the [remote debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol).
* Optionally pass a custom `_ready_check_` expression by passing it in the querystring, base64 encoded. Defaults to `document.querySelector('title').textContent`.
* Optionally pass a custom `_ready_check_interval_` to indicate how frequently the `_ready_check_` should be tested. Specified in milliseconds. Defaults to `100`.

## Example
```bash
$ node index.js &
$ curl http://unicodes.jessetane.com                       # empty dom
$ curl http://localhost:8080/http://unicodes.jessetane.com # dom with stuff
```

## Configuration
Enviroment variables you can set. Sane (hopefully) defaults are provided but you will probably need to adjust them.

#### `CHROME_{HOST,PORT}`
Defaults to localhost:9222.

#### `MAX_WORKERS`
You probably want to limit the number of tabs you have open at any given time depending on the resources you have available. Defaults to 5.

#### `TIMEOUT`
The amount of time workers are allowed to spend processing a request is capped. Defaults to 5000ms.

## Notes

#### Installing / running Chrome headlessly on Ubuntu
``` shell
apt-get install xvfb chromium-browser
xvfb-run chromium-browser --remote-debugging-port=9222
```

#### Running Chrome (with debugging enabled) on OS X
``` shell
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

#### Disabling image loading
To disable image loading for all users, you can create a Chrome [policy](https://www.chromium.org/developers/how-tos/enterprise/adding-new-policies) setting:
``` json
{
  "DefaultImagesSetting": 2
}
```

## License
Public domain
