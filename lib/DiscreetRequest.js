/**
 * discreetRequest.js
 * @description generates throttled http requests using rotating proxies and fake user agents
 */

const ProxyPool = require('./ProxyPool'),
      Throttler = require('./Throttler'),
      defaultUserAgents = require('../util/userAgents'),
      error = require('../util/error'),
      logger = require('../util/logger');

class DiscreetRequest {

  /**
   * @description sets the default options for the DiscreetRequest instance
   */
  constructor() {
    // flag to determine if the instance has been properly initialized
    this.initComplete = false;
    // placeholder for the ProxyPool instance
    this.proxyPool = null
    // the redis client instance
    this.redis = null;
    // the default cache expiration (1 day):
    this.cacheTTL = 86400;
    // list of user agents, with provided defaults
    this.userAgents = defaultUserAgents;
  }

  /**
   * init
   * @description sets the config for the discreet request class
   * @param {object} options - the configuration object
   * @see constructor above for a description for each option
   * @returns null
   */
  init(options={}) {
    const {
      proxies = [],
      proxyAuth = null,
      proxyPoolConfig = {},
      throttleConfig = {},
      redis = null,
      cacheTTL = 86400,
      userAgents = null
    } = options;
    this.proxyPool = new ProxyPool(proxies, proxyAuth, proxyPoolConfig);
    this.throttler = new Throttler(throttleConfig);
    this.userAgents = userAgents ? userAgents : this.userAgents;
    this.redis = redis;
    this.cacheTTL = cacheTTL,
    this.initComplete = true;
    logger.info('Discreet requests are enabled');
    return true;
  }


  /**
   * getRandomUserAgent
   * @description returns a random userAgent from this list of user agents
   * @returns {(string|null)} proxy - the proxy address to use for the descreet request
   */
  getRandomUserAgent() {
    if (this.userAgents.length > 0) {
      let randomIndex = Math.floor(Math.random() * Math.floor(this.userAgents.length - 1));
      return this.userAgents[randomIndex];
    } else {
      return null;
    }
  }

  /**
   * @description stores the data returned from an endpoint in the redis cache.
   *              Since we don't immediately need this can be safely be done async.
   * @param {string} endpoint - the endpoint url to be cached
   * @param {data} data - the data to be stored
   */
  cacheEndpoint(endpoint, data) {
    // check to make sure that redis is configured
    if (this.redis) {
      logger.dev(`Caching Endpoint: ${endpoint}`);
      this.redis.set(endpoint, data.toString(), 'EX', this.cacheTTL);
    }
  }

  /**
   * @description loads the cached endpoint data
   */
  loadEndpointCache(endpoint) {
    return new Promise((resolve, reject) => {
      if (this.redis) {
        this.redis.get(endpoint, (err, data) => {
          if (err) reject(err);
          else if (data !== null) {
            logger.dev(`Loading endpoint from cache: ${endpoint}`);
            resolve(data);
          }
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  }

  /**
   * @description reads / writes endpoint data to the cache creating new requests when necessary
   * @param {string} url -the url to request data from
   * @param {object} requestOptions - request object to be forwarded to the node request library
   */
  cachedRequest(url, requestOptions) {
    return new Promise((resolve, reject) => {
      if (this.redis) {
        this.loadEndpointCache(url).then((data) => {
          if (data !== null) {
            let response = {
              body: data,
              statusCode: null,
              cached: true,
              raw: null
            };
           resolve(response);
          } else {
            this.request(url, requestOptions)
            .then((response) => {
              this.cacheEndpoint(url, response.body);
              resolve(response);
            })
            .catch((err) => {
              reject(err);
            });
          }
        });
      } else {
       logger.warn('Redis is not configured for cached request');
       reject(new error.RedisError('ERROR: Redis not configured.'));
      }
    });
  }


  /**
   * @description generates the discreet request without cache
   * @param {string} url -the url to request data from
   * @param {object} requestOptions - request object to be forwarded to the node request library
   */
  request(url, requestOptions) {
    return new Promise((resolve, reject) => {
      if (this.initComplete) {
        requestOptions.url = url;
        let userAgent = this.getRandomUserAgent();
        let proxyUrl = this.proxyPool.getProxy();
        if (userAgent !== null) {
          requestOptions.headers = {'User-Agent': userAgent};
        }
        if (proxyUrl !== null) {
          requestOptions.proxy = proxyUrl;
          logger.dev(`Creating discreet request with proxy address ${proxyUrl}`);
        }
        this.throttler.queue(requestOptions)
        .then((result) => {
          const { err, response, body} = result;
          if (err) {
            logger.error(err);
            reject(new error.NetworkError(`Could not complete request to ${url}`));
          } else if (response && response.statusCode === 407) {
            reject(new error.ProxyError('ERROR: Could not authenticate with the proxy'));
          } else {
            let formattedResponse = {
              body: response.body,
              statusCode: response.statusCode,
              cached: false,
              raw: response
            };
            resolve(formattedResponse);
          }
        }).catch((err) => resolve(err));
      } else {
        logger.warn('You must first init the discreet instance before making a request calling discreet.init(...)');
        reject(new error.ProxyError('ERROR: discreet requests was not initialized'));
      }
    });
  }

}

module.exports = DiscreetRequest;
