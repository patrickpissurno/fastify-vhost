const fp = require('fastify-plugin');
const request = require('request');

module.exports = fp(function (fastify, opts, done) {
    if (!opts.upstream) 
        throw new Error('upstream must be specified');

    if(!opts.subdomain)
        throw new Error('subdomain must be specified');

    const subdomain = opts.subdomain + '.';

    fastify.addHook('onRequest', (req, res, next) => {
        if(req.headers.host != null && req.headers.host.indexOf(subdomain) !== -1)
        {
            let target = { url: req.url, baseUrl: opts.upstream };
            req.pipe(request(target)).pipe(res);
        }
        else
            next();
    });

    done();
});