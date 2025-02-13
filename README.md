# fastify-vhost
[![npm-version](https://img.shields.io/npm/v/fastify-vhost.svg)](https://www.npmjs.com/package/fastify-vhost)
[![coverage status](https://coveralls.io/repos/github/patrickpissurno/fastify-vhost/badge.svg?branch=master)](https://coveralls.io/github/patrickpissurno/fastify-vhost?branch=master)
[![known vulnerabilities](https://snyk.io/test/github/patrickpissurno/fastify-vhost/badge.svg)](https://snyk.io/test/github/patrickpissurno/fastify-vhost)
[![downloads](https://img.shields.io/npm/dt/fastify-vhost.svg)](https://www.npmjs.com/package/fastify-vhost)
[![license](https://img.shields.io/github/license/patrickpissurno/fastify-vhost.svg?maxAge=1800)](https://github.com/patrickpissurno/fastify-vhost/blob/master/LICENSE)

Proxy subdomain http requests to another server.
This [`fastify`](https://www.fastify.io) plugin forwards all the requests
received with a given subdomain to an upstream.

`fastify-vhost` is powered by the popular Nodejitsu [`http-proxy`](https://github.com/nodejitsu/node-http-proxy). [![GitHub stars](https://img.shields.io/github/stars/nodejitsu/node-http-proxy.svg?style=social&label=Star)](https://github.com/nodejitsu/node-http-proxy)

This plugin can be used if you want to point multiple (sub)domains to the same IP address, while running different servers on the same machine.

## Fastify support
Prior to `fastify-vhost@1.1.3` we only supported `fastify@1.x.x`. We are proud to announce that `fastify-vhost` now supports both v1, v2 and v3!

## Install

```
npm i fastify-vhost fastify
```

## Example

```js
const Fastify = require('fastify')
const server = Fastify()

server.register(require('fastify-vhost'), {
  upstream: 'http://localhost:3000',
  host: 'test.example.com'
})

server.listen(80)
```

This will proxy any request to the `test` subdomain to the server running at `http://localhost:3000`. For instance `http://test.example.com/users` will be proxied to `http://localhost:3000/users`.

If you want to have different vhosts for different subdomains you can register multiple instances of the plugin as shown in the following snippet:

```js
const Fastify = require('fastify')
const server = Fastify()
const vhost = require('fastify-vhost')

server.register(vhost, {
  upstream: 'http://localhost:3000',
  host: 'test.example.com'
})

server.register(vhost, {
  upstream: 'http://localhost:3001',
  host: 'other.example.com'
})

server.listen(80)
```

You can also specify multiple aliases for each vhost with the `hosts` option:

```js
const Fastify = require('fastify')
const server = Fastify()
const vhost = require('fastify-vhost')

server.register(vhost, {
  upstream: 'http://localhost:3000',
  hosts: ['test.example.com', 'test2.example.com']
})

server.register(vhost, {
  upstream: 'http://localhost:3001',
  host: 'other.example.com'
})

server.listen(80)
```

The above example would behave the same as the following:

```js
const Fastify = require('fastify')
const server = Fastify()
const vhost = require('fastify-vhost')

server.register(vhost, {
  upstream: 'http://localhost:3000',
  host: 'test.example.com'
})

server.register(vhost, {
  upstream: 'http://localhost:3000',
  host: 'test2.example.com'
})

server.register(vhost, {
  upstream: 'http://localhost:3001',
  host: 'other.example.com'
})

server.listen(80)
```

But in a much neater way.

Notice that it is **CRITICAL** to provide the full `host` (subdomain + domain) so that it properly routes the requests across different upstreams.

For other examples, see `example.js`.

## Options

This `fastify` plugin supports the following options.

*Note that this plugin is fully encapsulated and payloads will be streamed directly to the destination.*

### upstream

An URL (including protocol) that the requests will be forwarded to (eg. http://localhost:3000).

### host

The host to mount this plugin on. All the requests to the current server where the `host` header matches this string will be proxied to the provided upstream.

### hosts

Equivalent to the `host` option, but an array of strings. All the requests to the current server where the `host` header matches any of the strings will be proxied to the provided upstream.

### strict

```Default: false```. When strict mode is enabled, the host header has to be an exact match. When disabled, 'EXAMPLE.COM', 'example.com' and 'example.com:3000' will match 'example.com'.

### timeout

```Default: 30000```. Timeout in milliseconds for the proxy to return a ```504 Gateway Timeout```.

## Benchmarks

None yet. But you're welcome to open a PR.

## TODO

* [x] Add unit tests
* [x] Add integration tests
* [x] Coverage 100%
* [ ] Add benchmarks

## License

MIT
