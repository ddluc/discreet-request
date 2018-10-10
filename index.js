/**
 * discreetRequest.js
 * @description generates throttled http requests using rotating proxies and fake user agents
 */

const request = require('request'),
      throttledRequest = require('throttled-request')(request),
      defaultUserAgents = require('./util/userAgents'),
      error = require('./util/error'),
      logger = require('./util/logger');

class DiscreetRequest {

  /**
   * @description sets the default options for the DiscreetRequest instance
   */
  constructor() {
    this.throttleConfig = {
        // determines how many requests are made
        requests: 1,
        // determines the frequency at which requests are made
        milliseconds: 500
    };
    // flag to determine if the instance has been properly initialized
    this.initComplete = false;
    /// list of the user's proxies
    this.proxies = [];
    // the username and password for the proxies
    this.proxyAuth = {
      username: '',
      password: ''
    };
    // list of user agents, with provided defaults
    this.userAgents = defaultUserAgents;
  }

  /**
   * init
   * @description sets the config for the discreet request class
   * @param {proxies} - the list of proxy addresses to use for requests
   * @param {proxyAuth} - the username and password for the proxies
   * @param {throttleConfig} - the request throttler configuration
   * @returns null
   */
  init(proxies=[], proxyAuth=null, throttleConfig=null, userAgents=null) {
    this.proxies = proxies;
    this.proxyAuth = proxyAuth ? proxyAuth : this.proxyAuth;
    this.throttleConfig = throttleConfig ? throttleConfig : this.throttleConfig;
    this.userAgents = userAgents ? userAgents : this.userAgents;
    throttledRequest.configure(throttleConfig);
    this.initComplete = true;
  }

  /**
   * getRandomProxy
   * @description returns a random proxy from the list of proxies
   * @returns {string} proxy - the proxy address to use for the descreet request
   * @returns {boolean} false - if there are no proxies to use
   */
  getRandomProxy() {
    if (this.proxies.length > 0) {
      let randomIndex = Math.floor(Math.random() * Math.floor(this.proxies.length - 1));
      return this.proxies[randomIndex];
    } else {
      return false;
    }
  }

  /**
   * getRandomUserAgent
   * @description returns a random userAgent from this list of user agents
   * @returns {string} proxy - the proxy address to use for the descreet request
   * @returns {boolean} false - if there are no userAgents to use
   */
  getRandomUserAgent() {
    if (this.userAgents.length > 0) {
      let randomIndex = Math.floor(Math.random() * Math.floor(this.userAgents.length - 1));
      return this.userAgents[randomIndex];
    } else {
      return false;
    }
  }

  /**
   *
   * @description generates the discreet request
   * @param {object} requestOptions - request object to be forwarded to the node request library
   * @param {object} protocol - either HTTP or HTTPS
   */
  request(requestOptions, proxyAuth, protocol='http') {
    return new Promise((resolve, reject) => {
      if (this.initComplete) {
        let userAgent = this.getRandomUserAgent();
        let proxy = this.getRandomProxy();
        if (proxy) {
          requestOptions.proxy = `${protocol}://${proxy}:${this.proxyAuth.username}:${this.proxyAuth.password}`;
        }
        if (userAgent) {
          requestOptions.headers = {'User-Agent': userAgent};
        }
        logger.dev(`Creating discreet request with proxy address ${proxy} and User Agent ${userAgent}`);
        throttledRequest(requestOptions, (err, response, body) => {
          if (err) {
            logger.error(err);
            reject(new error.NetworkError(`Could not complete request to ${requestOptions.uri}`));
          } else {
            resolve(response);
          }
        });
      } else {
        logger.warn('You must first init the discreet instance before making a request calling discreet.init(...)');
        reject(new error.ProxyError('ERROR: discreet requests was not initialized'));
      }
    });
  }

}

module.exports = new DiscreetRequest();
