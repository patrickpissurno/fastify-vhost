"use strict";

function _createForOfIteratorHelper(o, allowArrayLike) {
  var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];

  if (!it) {
    if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
      if (it) o = it;
      var i = 0;

      var F = function F() {};

      return {
        s: F,
        n: function n() {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        },
        e: function e(_e) {
          throw _e;
        },
        f: F
      };
    }

    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var normalCompletion = true,
      didErr = false,
      err;
  return {
    s: function s() {
      it = it.call(o);
    },
    n: function n() {
      var step = it.next();
      normalCompletion = step.done;
      return step;
    },
    e: function e(_e2) {
      didErr = true;
      err = _e2;
    },
    f: function f() {
      try {
        if (!normalCompletion && it["return"] != null) it["return"]();
      } finally {
        if (didErr) throw err;
      }
    }
  };
}

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}

function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

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

  var _iterator = _createForOfIteratorHelper(opts.hosts),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var host = _step.value;
      if (typeof host !== 'string') throw new Error('host must be string');
      if (host.indexOf('.') === -1) throw new Error('host must contain the TLD (eg. should be "example.com" instead of "example"). Please refer to the docs for further information');
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
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
    if (req.raw != null) //fastify 3.x.x
      handleRequest(req.raw, res.raw, next);else if (req.req != null) //fastify 2.x.x
      handleRequest(req.req, res.res, next);else //fastify 1.x.x 
      handleRequest(req, res, next);
  });

  function handleRequest(req, res, next) {
    var handled = false;

    var _iterator2 = _createForOfIteratorHelper(opts.hosts),
        _step2;

    try {
      for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
        var host = _step2.value;

        if (matches(req.headers, host, strict)) {
          proxy.web(req, res);
          handled = true;
          break;
        }
      }
    } catch (err) {
      _iterator2.e(err);
    } finally {
      _iterator2.f();
    }

    if (!handled) next();
  }

  done();
});