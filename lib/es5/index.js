"use strict";

var fp = require('fastify-plugin');

var httpProxy = require('http-proxy');

var matches = require('./matches');

module.exports = fp(function (fastify, opts, done) {
  if (!opts.upstream) throw new Error('upstream must be specified');
  if (opts.subdomain) throw new Error('"subdomain" option was removed in version 1.1.x');
  if (opts.host && opts.hosts) throw new Error('you should either provide host or hosts, but not both');

  if (!opts.hosts) {
    if (!opts.host) {
      if (opts.fullHost) {
        console.warn('Deprecation notice: "fullHost" was renamed to "host" in version 1.1.x and may me removed in future versions');
        opts.host = opts.fullHost;
      } else throw new Error('either host or hosts must be specified');
    }

    opts.hosts = [opts.host];
  }

  if (opts.hosts.length < 1) throw new Error('either host or hosts must be specified');
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = opts.hosts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var host = _step.value;
      if (typeof host !== 'string') throw new Error('host must be string');
      if (host.indexOf('.') === -1) throw new Error('host must contain the TLD (eg. should be "example.com" instead of "example"). Please refer to the docs for further information');
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
        _iterator["return"]();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  var timeout = 30 * 1000;

  if (opts.timeout !== undefined) {
    if (typeof opts.timeout !== 'number' || isNaN(opts.timeout)) throw new Error('timeout should be a valid number');
    if (opts.timeout <= 0) throw new Error('timeout should be greater than 0');
    timeout = opts.timeout;
  }

  var strict = opts.strict === true;
  var proxy = httpProxy.createProxyServer({
    target: opts.upstream,
    proxyTimeout: timeout
  });
  proxy.on('error', function (err, req, res) {
    var status;
    var message;

    if (err.code === 'ECONNREFUSED') {
      status = 503;
      message = 'Service Unavailable';
    }
    /* istanbul ignore next */
    else if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        status = 504;
        message = 'Gateway Timeout';
      }
      /* istanbul ignore next */
      else {
          status = 502;
          message = 'Bad Gateway';
        }

    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      statusCode: status,
      error: message,
      message: message
    }));
  });
  fastify.addHook('onRequest', function (req, res, next) {
    /* istanbul ignore next */
    if (req.req != null) //fastify 2.x.x
      handleRequest(req.req, res.res, next);else //fastify 1.x.x 
      handleRequest(req, res, next);
  });

  function handleRequest(req, res, next) {
    var handled = false;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = opts.hosts[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var host = _step2.value;

        if (matches(req.headers, host, strict)) {
          proxy.web(req, res);
          handled = true;
          break;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    if (!handled) next();
  }

  done();
});