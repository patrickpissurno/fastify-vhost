const fastify = require('fastify');
const vhost = require('.');
const noop = () => {};

const tap = require('tap');
const rp = require('request-promise-native');
const pump = require('pump');
const fs = require('fs');

const fastifyA = fastify();
const fastifyB = fastify();

async function stop(){
    await fastifyA.close();
    await fastifyB.close();
}

const deleteSchema = {
    body: {
        type: 'object',
        properties: {
            test: {
                type: 'number',
                const: 123
            }
        },
        required: ['test'],
        additionalProperties: false
    }
}

async function listen(){
    fastifyA.get('/', async (req, reply) => 'Hi from example.com');
    fastifyB.get('/', async (req, reply) => 'Hi from test.example.com');
    fastifyA.get('/headers', async (req, reply) => req.headers);
    fastifyB.get('/headers', async (req, reply) => req.headers);
    fastifyB.get('/timeout', async (req, reply) => { });
    fastifyB.get('/error500', (req, reply) => reply.status(500).send('Internal Server Error'));
    fastifyB.get('/error400', (req, reply) => reply.status(400).send('Bad Request'));

    fastifyA.delete('/', { schema: deleteSchema }, async (req, reply) => 'DELETE example.com');
    fastifyB.delete('/', { schema: deleteSchema }, async (req, reply) => 'DELETE test.example.com');
    fastifyB.delete('/nobody', async (req, reply) => 'DELETE test.example.com/nobody');
    fastifyB.delete('/timeout', { schema: deleteSchema }, async (req, reply) => { });
    fastifyB.delete('/error500', { schema: deleteSchema }, (req, reply) => reply.status(500).send('Internal Server Error'));
    fastifyB.delete('/error400', { schema: deleteSchema }, (req, reply) => reply.status(400).send('Bad Request'));

    fastifyA.post('/multipart', (req, reply) => {
        function handler (field, file, filename, encoding, mimetype) {
            let stream = fs.createWriteStream('test1-new-fastifyA.txt');
            pump(file, stream);

            stream.once('close', () => {
                reply.send(fs.readFileSync('test1-new-fastifyA.txt').toString());
                fs.unlinkSync('test1-new-fastifyA.txt');
            });
        }
        req.multipart(handler, err => {
            if(err)
                throw err;
        });
    });
    fastifyB.post('/multipart', (req, reply) => {
        function handler (field, file, filename, encoding, mimetype) {
            let stream = fs.createWriteStream('test1-new-fastifyB.txt');
            pump(file, stream);

            stream.once('close', () => {
                reply.send(fs.readFileSync('test1-new-fastifyB.txt').toString());
                fs.unlinkSync('test1-new-fastifyB.txt');
            });
        }
        req.multipart(handler, err => {
            if(err)
                throw err;
        });
    });

    fastifyA.register(vhost, {
        upstream: 'http://localhost:3001',
        host: 'test.example.com',
        timeout: 3000
    });

    fastifyA.register(vhost, {
        upstream: 'http://localhost:3002',
        host: 'test2.example.com',
        timeout: 1000
    });

    fastifyA.register(require('fastify-multipart'));
    fastifyB.register(require('fastify-multipart'));


    await fastifyA.listen(3000, '0.0.0.0');
    await fastifyB.listen(3001, '0.0.0.0');
}

async function testDELETE(){
    const body = { test: 123 };
    await tap.test('DELETE domain', async () => {
        let r = await rp('http://example.com:3000', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        tap.equal(r, 'DELETE example.com');
    });
    await tap.test('DELETE subdomain', async () => {
        let r = await rp('http://test.example.com:3000', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
        tap.equal(r, 'DELETE test.example.com');
    });
    await tap.test('DELETE subdomain without body', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/nobody', { method: 'DELETE', headers: { 'content-type': 'application/json' } });
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 400, 'upstream error messages should be forwarded');
    });
    await tap.test('DELETE subdomain (offline upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test2.example.com:3000', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 503, 'offline upstream should return Service Unavailable (503)');
    });
    await tap.test('DELETE subdomain (timeout upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/timeout', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 504, 'timeout upstream should return Gateway Timeout (504)');
    });
    await tap.test('DELETE subdomain (500 error upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/error500', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return -1;
            }
        })();
        tap.equal(r, 500, '500 error upstream should be forwarded');
    });
    await tap.test('DELETE subdomain (400 error upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/error400', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 400, '400 error upstream should be forwarded');
    });
}

async function testGET(){
    await tap.test('GET domain', async () => {
        let r = await rp('http://example.com:3000');
        tap.equal(r, 'Hi from example.com');
    });
    await tap.test('GET subdomain', async () => {
        let r = await rp('http://test.example.com:3000');
        tap.equal(r, 'Hi from test.example.com');
    });
    await tap.test('GET subdomain (offline upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test2.example.com:3000');
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 503, 'offline upstream should return Service Unavailable (503)');
    });
    await tap.test('GET subdomain (timeout upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/timeout');
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 504, 'timeout upstream should return Gateway Timeout (504)');
    });
    await tap.test('GET subdomain (500 error upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/error500');
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return -1;
            }
        })();
        tap.equal(r, 500, '500 error upstream should be forwarded');
    });
    await tap.test('GET subdomain (400 error upstream)', async () => {
        let r = await (async () => {
            try {
                await rp('http://test.example.com:3000/error400');
                return 200;
            }
            catch(ex){
                if(ex && ex.response)
                    return ex.response.statusCode;
                return 500;
            }
        })();
        tap.equal(r, 400, '400 error upstream should be forwarded');
    });
}

async function testHeaders(){
    const opt = {
        headers: {
            'Authorization': '123'
        }
    };
    await tap.test('Headers domain', async () => {
        let r = JSON.parse(await rp('http://example.com:3000/headers', opt));
        for(let key in opt.headers)
            tap.equal(r[key.toLowerCase()], opt.headers[key]);
        tap.equal(r.host, 'example.com:3000');
    });
    await tap.test('Headers subdomain', async () => {
        let r = JSON.parse(await rp('http://test.example.com:3000/headers', opt));
        for(let key in opt.headers)
            tap.equal(r[key.toLowerCase()], opt.headers[key]);
        tap.equal(r.host, 'test.example.com:3000');
    });
    await tap.test('Headers domain & subdomain', async () => {
        let r1 = JSON.parse(await rp('http://example.com:3000/headers', opt));
        let r2 = JSON.parse(await rp('http://test.example.com:3000/headers', opt));
        for(let key in r1)
            if(key !== 'host')
                tap.equal(r2[key], r1[key]);
    });
}
async function testMultipart(){
    fs.writeFileSync('test1-original.txt', '123');

    const opt = {
        method: 'POST',
        headers: {
            'Authorization': '123'
        }
    };

    opt.formData = {
        file: fs.createReadStream('test1-original.txt')
    };

    await tap.test('Multipart domain', async () => {
        let r = await rp('http://example.com:3000/multipart', opt);
        tap.equal(r, fs.readFileSync('test1-original.txt').toString());
    });

    opt.formData = {
        file: fs.createReadStream('test1-original.txt')
    };

    await tap.test('Multipart subdomain', async () => {
        let r = await rp('http://test.example.com:3000/multipart', opt);
        tap.equal(r, fs.readFileSync('test1-original.txt').toString());
    });

    fs.unlinkSync('test1-original.txt');
}

function testOptions(){
    tap.throws(() => vhost(null, null), {}, 'null options should throw');
    tap.throws(() => vhost(null, { host: 'test.com' }), {}, 'options missing upstream should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost' }), {}, 'options missing host should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', subdomain: 'test' }), {}, 'options containing subdomain should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 123 }), {}, 'non-string host should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 'test' }), {}, 'tld-missing host should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 'test.com', timeout: 'invalid' }), {}, 'invalid timeout should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 'test.com', timeout: -1 }), {}, 'negative timeout should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 'test.com', timeout: 0 }), {}, 'timeout=0 should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', host: 'test.com', hosts: [ ] }), {}, 'with both host and hosts should throw');
    tap.throws(() => vhost(null, { upstream: 'localhost', hosts: [ ] }), {}, 'empty hosts should throw');

    tap.doesNotThrow(() => vhost(fastify(), { upstream: 'localhost', fullHost: 'test.com' }, noop), {}, 'should support "fullHost" alias for "host"');
}

async function tests(){
    testOptions();

    await tap.test('listen', async (t) => listen());
    await testGET();
    await testDELETE();
    await testHeaders();
    await testMultipart();
    await stop();
}
tests();