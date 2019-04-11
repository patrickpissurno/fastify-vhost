"use strict";

var fp = require('fastify-plugin');

var request = require('request');

module.exports = fp(function (fastify, opts, done) {
  if (!opts.upstream) throw new Error('upstream must be specified');
  if (!opts.subdomain && !opts.fullHost) throw new Error('either subdomain or fullHost must be specified');
  var subdomain = opts.subdomain ? opts.subdomain + '.' : null;
  var fullHost = opts.fullHost ? opts.fullHost : null;
  fastify.addHook('onRequest', function (req, res, next) {
    if (req.headers.host != null && (fullHost ? req.headers.host == fullHost : req.headers.host.indexOf(subdomain) !== -1)) {
      var target = {
        url: req.url,
        baseUrl: opts.upstream,
        headers: req.headers
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