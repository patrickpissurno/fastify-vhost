const fp = require('fastify-plugin');
const httpProxy = require('http-proxy');
const matches = require('./matches');

module.exports = fp(function (fastify, opts, done) {
    if (!opts.upstream) 
        throw new Error('upstream must be specified');

    if(opts.subdomain)
        throw new Error('"subdomain" option was removed in version 1.1.x');

    if(opts.host && opts.hosts)
        throw new Error('you should either provide host or hosts, but not both');

    if(!opts.hosts){
        if(!opts.host){
            if(opts.fullHost){
                console.warn('Deprecation notice: "fullHost" was renamed to "host" in version 1.1.x and may me removed in future versions');
                opts.host = opts.fullHost;
            }
            else
                throw new Error('either host or hosts must be specified');
        }

        opts.hosts = [ opts.host ];
    }

    if(opts.hosts.length < 1)
        throw new Error('either host or hosts must be specified');

    for(let host of opts.hosts){
        if(typeof(host) !== 'string')
            throw new Error('host must be string');

        if(host.indexOf('.') === -1)
            throw new Error('host must contain the TLD (eg. should be "example.com" instead of "example"). Please refer to the docs for further information');
    }

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
        let status;
        let message;

        if(err.code === 'ECONNREFUSED'){
            status = 503;
            message = 'Service Unavailable';
        }
        else /* istanbul ignore next */ if(err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT'){
            status = 504;
            message = 'Gateway Timeout';
        }
        else /* istanbul ignore next */ {
            status = 502;
            message = 'Bad Gateway'
        }

        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            statusCode: status,
            error: message,
            message: message
        }));
    });

    fastify.addHook('onRequest', (req, res, next) => {
        
        /* istanbul ignore next */
        if(req.raw != null) //fastify 3.x.x
            handleRequest(req.raw, res.raw, next);
        else if(req.req != null) //fastify 2.x.x
            handleRequest(req.req, res.res, next);
        else //fastify 1.x.x 
            handleRequest(req, res, next);
            
    });

    function handleRequest(req, res, next){
        let handled = false;
        
        for(let host of opts.hosts){
            if(matches(req.headers, host, strict)){
                proxy.web(req, res);
                handled = true;
                break;
            }
        }

        if(!handled)
            next();
    }

    done();
});