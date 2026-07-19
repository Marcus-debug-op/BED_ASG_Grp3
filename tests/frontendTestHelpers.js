function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

module.exports = { flushPromises, jsonResponse };