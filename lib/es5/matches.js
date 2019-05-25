"use strict";

module.exports = function matches(headers, expectedHost, strict) {
  if (headers == null || headers.host == null || typeof headers.host !== 'string') return null;
  if (expectedHost != null) return matchesHost(headers.host, expectedHost, strict);
  return null;
};

function matchesHost(host, expected, strict) {
  if (strict) return host === expected;
  host = host.split(':')[0];
  host = host.trim();
  return host.toLowerCase() == expected.toLowerCase();
}