# underpainting
Render HTML on the server that's supposed to be rendered on the client.

## Why
From what I can tell it's still not possible to get decent search results for applications rendered entirely on the client. Google's fetch & render in webmaster tools seems to run JavaScript perfectly well, but the crawler itself must not be doing the same thing. Please correct me if I'm mistaken and / or just doing it rong!

[Prerender](https://github.com/prerender/prerender) is a nice idea for solving the problem, but it seems overly complex and ran my server OOM so I hacked this up instead.

## How
BYO Chromium, talk to it using the [remote debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol). Optionally pass a custom "ready check" expression - defaults to `document.querySelector('title').textContent`. You can pass it in the querystring, base64 encoded under the key `_ready_check_`.

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

#### `READY_CHECK_INTERVAL`
The interval at which to execute the target's ready check. Defaults to 100ms.

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
To disable image loading, you need this setting in Chrome's config file:
``` json
{
  "profile": {
    "default_content_setting_values": {
      "images": 2
    }
  }
}
```

* the config file on linux:
  * ~/.config/chromium/Local\ State
* the config file on mac:
  * ~/Library/Application\ Support/Google/Chrome/Default/Preferences

## License
Public domain
