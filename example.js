const fastify = require('fastify');
const vhost = require('.');

const fastifyA = fastify();
const fastifyB = fastify();

fastifyA.get('/', async (req, reply) => 'Hi from example.com');
fastifyB.get('/', async (req, reply) => 'Hi from test.example.com');

fastifyA.register(vhost, {
    upstream: 'http://localhost:3001',
    subdomain: 'test'
});

fastifyA.listen(3000, '0.0.0.0', () => console.log('A running'));
fastifyB.listen(3001, '0.0.0.0', () => console.log('B running'));