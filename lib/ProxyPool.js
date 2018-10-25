/**
 * @description creates and maintains a pool of healthy proxies
 */

const request = require('request')
      logger = require('../util/logger');

class ProxyPool {

  /**
   * @constructor
   * @param {Array} proxies - a list of proxies to add to the pool
   * @param {proxyPoolConfig} - a list of configuration options for the proxy pool
   */
  constructor(proxies=[], proxyPoolConfig) {
    const {
      targetEndpoint = 'http://bing.com',
      failureCases = [407, 403, 408],
      refreshProxies = false,
      refreshRate = 3600000
    } = proxyPoolConfig;
    // the proxies
    this.proxies = proxies;
    // the pool of healthy proxies
    this.healthyProxies = [];
    // the current proxy index (makes sure proxies are rotated in order)
    this.proxyIndex = 0;
    // flag to determine if proxies should be refreshed
    this.refreshProxies = refreshProxies;
    // how often to refresh the proxeies (default is 1 hour)
    this.refreshRate = refreshRate;
    // the endpoint to use to test the proxies
    this.targetEndpoint = targetEndpoint;
    // the status codes for which indicate a dead/inoperable proxy
    this.failureCases = failureCases;
    // Run the intial test, and set up monitoring, if enabled
    this.testProxies();
    if (this.monitorProxies) {
      this.monitorProxies();
    }
  }

  /**
   * @description tests the entire list of proxies against the target endpoints
   */
  testProxies () {
    this.proxies.forEach((proxy, index) => {
      request.get(this.targetEndpoint, (err, response, body) => {
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
      });
    });
  }

  /**
   * @description tests the proxies at a given interval (default is one hour)
   */
  monitorProxies() {
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
      return queuedProxy;
    } else {
     return null;
    }
  }

}

module.exports = ProxyPool;
