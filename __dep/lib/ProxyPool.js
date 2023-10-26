/**
 * @description creates and maintains a pool of healthy proxies
 */

const Throttler = require('./Throttler'),
      logger = require('../util/logger');

class ProxyPool {

  /**
   * @constructor
   * @param {Array} proxies - a list of proxies to add to the pool
   * @param {Object} proxyAuth - the proxy username and password
   * @param {options} - a list of configuration options for the proxy pool
   */
  constructor(proxies=[], proxyAuth=null, options={}) {
    const {
      testProxies = true,
      targetEndpoint = 'http://bing.com',
      failureCases = [407, 403, 408],
      refreshProxies = false,
      refreshRate = 3600000,
      protocol = 'http'
    } = options;
    // the proxies
    this.proxies = proxies;
    // the proxy authentication
    this.proxyAuth = proxyAuth;
    // the protocol to use for the proxies
    this.protocol = protocol;
    // the pool of healthy proxies
    this.healthyProxies = [];
    // the current proxy index (makes sure proxies are rotated in order)
    this.proxyIndex = 0;
    // how often to refresh the proxeies (default is 1 hour)
    this.refreshRate = refreshRate;
    // the endpoint to use to test the proxies
    this.targetEndpoint = targetEndpoint;
    // the status codes for which indicate a dead/inoperable proxy
    this.failureCases = failureCases;
    // initialize a new throttler
    this.throttler = new Throttler();
    // flag to determine if proxies shold be tested
    this.testProxies = testProxies;
    // flag to determine if proxies should be refreshed
    this.refreshProxies = refreshProxies;
    // internal flag for debugging
    this.__PROXY_TEST_COUNT = 0;
  }

  compose() {
    // Run the intial test, and set up monitoring, if enabled
    if (this.testProxies && this.refreshProxies) {
      this.runProxyTestsOnInterval();
    } else if (this.testProxies) {
      this.runProxyTests();
    } else {
      this.healthyProxies = this.proxies;
    }
  }

  /**
   * @description tests the entire list of proxies against the target endpoints
   */
  runProxyTests () {
    // reset the pool of healthy proxies
    this.healthyProxies = [];
    this.proxies.forEach((proxy, index) => {
      let proxyUrl = this.buildProxyUrl(proxy);
      let requestOptions = {
        proxy: proxyUrl,
        url: this.targetEndpoint,
        method: 'GET'
      };
      this.throttler.queue(requestOptions)
      .then((result) => {
        this.__PROXY_TEST_COUNT = this.__PROXY_TEST_COUNT + 1;
        let {err, response, body} = result;
        if (err) {
          logger.error(err);
        } else if (response) {
          const {statusCode, statusMessage } = response;
          if (this.failureCases.includes(statusCode)) {
            logger.warn(`Proxy ${proxy} failed health test with status code ${statusCode} ${statusMessage} `)
          } else {
            this.healthyProxies.push(proxy);
            logger.info(`Proxy ${proxy} passed health test with status code ${statusCode} ${statusMessage}`);
          }
        }
      }).catch((err) => logger.error(err));
    });
  }

  /**
   * @description tests the proxies at a given interval (default is one hour)
   */
  runProxyTestsOnInterval() {
    setInterval(() => {
      this.testProxies();
    }, this.refreshRate);
  }

  /**
   * @description returns a healthy proxy
   * @returns {(string|null)} proxy - either a proxy string or null, if there are no health proxies
   */
  getProxy() {
    if (this.healthyProxies.length > 0) {
      let queuedProxy = this.healthyProxies[this.proxyIndex];
      if (this.proxyIndex < (this.healthyProxies.length - 1)) {
        this.proxyIndex = this.proxyIndex + 1;
      } else if (this.proxyIndex >= (this.healthyProxies.length -1)) {
        this.proxyIndex = 0;
      }
      let queuedProxyUrl = this.buildProxyUrl(queuedProxy);
      return queuedProxyUrl;
    } else {
     return null;
    }
  }

  /**
   * @description gets a full proxy url
   * @returns {(string | null)} fullProxyUrl - the full proxy url with protocol
   */
  buildProxyUrl(proxy) {
    let fullProxyUrl = null;
    if (proxy !== null) {
      if (
          (this.proxyAuth !== null && typeof this.proxyAuth.username === 'string') &&
          (this.proxyAuth !== null && typeof this.proxyAuth.password === 'string')
      ) {
        fullProxyUrl = `${this.protocol}://${this.proxyAuth.username}:${this.proxyAuth.password}@${proxy}`;
      } else {
        fullProxyUrl = `${this.protocol}://${proxy}`;
      }
    }
    return fullProxyUrl;
  }

}

module.exports = ProxyPool;
