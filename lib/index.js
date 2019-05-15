"use strict";

var fp = require('fastify-plugin');

var request = require('request');

var matches = require('./matches');

module.exports = fp(function (fastify, opts, done) {
  if (!opts.upstream) throw new Error('upstream must be specified');

  if (!opts.host) {
    if (opts.subdomain) throw new Error('"subdomain" option was removed in version 1.1.x');

    if (opts.fullHost) {
      console.warn('Deprecation notice: "fullHost" was renamed to "host" in version 1.1.x and may me removed in future versions');
      opts.host = opts.fullHost;
    } else throw new Error('host must be specified');
  }

  if (typeof opts.host !== 'string') throw new Error('host must be string');
  if (opts.host.indexOf('.') === -1) throw new Error('host must contain the TLD (eg. should be "example.com" instead of "example"). Please refer to the docs for further information');
  var timeout = 30 * 1000;

  if (opts.timeout !== undefined) {
    if (typeof opts.timeout !== 'number' || isNaN(opts.timeout)) throw new Error('timeout should be a valid number');
    if (opts.timeout <= 0) throw new Error('timeout should be greater than 0');
    timeout = opts.timeout;
  }

  var strict = opts.strict === true;
  fastify.addHook('onRequest', function (req, res, next) {
    if (matches(req.headers, opts.host, strict)) {
      var target = {
        url: req.url,
        baseUrl: opts.upstream,
        headers: req.headers,
        timeout: timeout
      };

      try {
        req.pipe(request(target)).pipe(res);
      } catch (ex) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "Cannot proxy this request to the origin server"
        }));
        console.error(ex);
      }
    } else next();
  });
  done();
});