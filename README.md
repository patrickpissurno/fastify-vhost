# fastify-vhost
[![npm-version](https://img.shields.io/npm/v/fastify-vhost.svg)](https://www.npmjs.com/package/fastify-vhost)
[![downloads](https://img.shields.io/npm/dt/fastify-vhost.svg)](http://npm-stats.com/~packages/fastify-vhost)
[![license](https://img.shields.io/github/license/patrickpissurno/fastify-vhost.svg?maxAge=1800)](https://github.com/patrickpissurno/fastify-vhost/blob/master/LICENSE)

Proxy subdomain http requests to another server.
This [`fastify`](https://www.fastify.io) plugin forwards all the requests
received with a given subdomain to an upstream.

`fastify-vhost` is built on top of
[`request`](https://www.npmjs.com/package/request), which enables
http request piping.

This plugin can be used if you want to point multiple subdomains to the same IP address, while running different servers on the same machine.

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
  subdomain: 'test'
})

server.listen(80)
```

This will proxy any request to the `test` subdomain to the server running at `http://localhost:3000`. For instance `http://test.example.com/users` will be proxied to `http://example.com:3000/users`.

If you want to have different vhosts for different subdomains you can register multiple instances of the plugin as shown in the following snippet:

```js
const Fastify = require('fastify')
const server = Fastify()
const vhost = require('fastify-vhost')

server.register(vhost, {
  upstream: 'http://localhost:3000',
  subdomain: 'test'
})

server.register(vhost, {
  upstream: 'http://localhost:3001',
  subdomain: 'other'
})

server.listen(80)
```

Notice that it is **VERY** important to provide the full `subdomain` to tell the vhost how to properly route the requests across different upstreams.

For other examples, see `example.js`.

## Options

This `fastify` plugin supports the following options.

*Note that this plugin is fully encapsulated and payloads will be streamed directly to the destination.*

### upstream

An URL (including protocol) that represents the target server to use for proxying.

### subdomain

The subdomain to mount this plugin on. All the requests to the current server where the `host` header contains the given subdomain will be proxied to the provided upstream.

## Benchmarks

None yet. But you're welcome to open a PR.

## TODO

* [ ] Add benchmarks
* [ ] Add unit tests

## License

MIT
