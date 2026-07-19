function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

module.exports = { flushPromises, jsonResponse };
