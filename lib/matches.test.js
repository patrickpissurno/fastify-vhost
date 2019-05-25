const tap = require('tap');
const matches = require('./matches');

tap.equal(matches(null, null), null, 'null returns null');
tap.equal(matches({}, null), null, 'missing header returns null');
tap.equal(matches({ host: null }, 'test.com'), null, 'null header returns null');
tap.equal(matches({ host: 12.4 }, 'test.com'), null, 'invalid header returns null');
tap.equal(matches({ host: undefined }, 'test.com'), null, 'undefined header returns null');
tap.equal(matches({ host: 'test.com' }, null), null, 'null expected returns null');

tap.equal(matches({ host: 'example.com' }, 'test.com'), false, 'root domain should not match');
tap.equal(matches({ host: 'test.example.com' }, 'test.example.com'), true, 'test subdomain should match');
tap.equal(matches({ host: 'test.com' }, 'test.test.com'), false, 'root domain should not match');
tap.equal(matches({ host: 'test.com:3000' }, 'test.com'), true, 'host + port should match');
tap.equal(matches({ host: 'TEST.com' }, 'test.com'), true, 'case insensitive should match');
tap.equal(matches({ host: ' test.com ' }, 'test.com'), true, 'host with whitespaces should match');

tap.equal(matches({ host: 'test.com:3000' }, 'test.com', true), false, '[strict] host + port should not match');
tap.equal(matches({ host: 'TEST.com' }, 'test.com', true), false, '[strict] case insensitive should not match');
tap.equal(matches({ host: ' test.com ' }, 'test.com', true), false, '[strict] host containing whitespaces should not match');