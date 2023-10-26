
const request = require('request'),
      throttledRequest = require('throttled-request')(request);

class Throttler {

  constructor(config={}) {
    const {
      requests = 1,
      milliseconds = 500
    } = config;
    throttledRequest.configure({requests, milliseconds});
  }

  /**
   * @param {object} requestOptions - the option for the http request
   */
  queue(requestOptions) {
    return new Promise((resolve, reject) => {
      throttledRequest(requestOptions, (err, response, body) => {
        resolve({err, response, body});
      });
    });
  }

}

module.exports = Throttler;
