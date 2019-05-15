const fp = require('fastify-plugin');
const httpProxy = require('http-proxy');
const matches = require('./matches');

module.exports = fp(function (fastify, opts, done) {
    if (!opts.upstream) 
        throw new Error('upstream must be specified');

    if(!opts.host){
        if(opts.subdomain)
            throw new Error('"subdomain" option was removed in version 1.1.x');

        if(opts.fullHost){
            console.warn('Deprecation notice: "fullHost" was renamed to "host" in version 1.1.x and may me removed in future versions');
            opts.host = opts.fullHost;
        }
        else
            throw new Error('host must be specified');
    }

    if(typeof(opts.host) !== 'string')
        throw new Error('host must be string');

    if(opts.host.indexOf('.') === -1)
        throw new Error('host must contain the TLD (eg. should be "example.com" instead of "example"). Please refer to the docs for further information');

    let timeout = 30 * 1000;
    if(opts.timeout !== undefined){
        if(typeof(opts.timeout) !== 'number' || isNaN(opts.timeout))
            throw new Error('timeout should be a valid number');
        if(opts.timeout <= 0)
            throw new Error('timeout should be greater than 0');
        timeout = opts.timeout;
    }

    const strict = opts.strict === true;

    const proxy = httpProxy.createProxyServer({ target: opts.upstream, proxyTimeout: timeout });
    proxy.on('error', (err, req, res) => {
        let status = 502;
        let message = 'Bad Gateway'

        if(err.code === 'ECONNREFUSED'){
            status = 503;
            message = 'Service Unavailable';
        }
        else if(err.code === 'ECONNRESET'){
            status = 504;
            message = 'Gateway Timeout';
        }

        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            statusCode: status,
            error: message,
            message: message
        }));
    });

    fastify.addHook('onRequest', (req, res, next) => {
        if(matches(req.headers, opts.host, strict))
            proxy.web(req, res);
        else
            next();
    });

    done();
});