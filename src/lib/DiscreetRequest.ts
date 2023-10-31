

import ProxyPool from "./ProxyPool";
import Throttler from "./Throttler";
import DEAFULT_USER_AGENTS from '../util/userAgents';
import { NetworkError, RequestError, ProxyError, RedisError } from "../util/error";
import logger from "../util/logger";

import type { RedisClient, Nullable, MainConfig, RequestOptions, DiscreetResponse } from "../types";


class DiscreetRequest {

  private initComplete: boolean;

  redis: Nullable<RedisClient>;

  cache: boolean;

  cacheTTL: number; 

  userAgents: string[];

  throttler: Throttler;

  proxyPool: ProxyPool;

/**
 * @description sets the default options for the DiscreetRequest instance
 */
  constructor() {
    // flag to determine if the instance has been properly initialized
    this.initComplete = false;
    // Placeholder for the ProxyPool instance
    this.proxyPool = new ProxyPool(); 
    // Placeholder for the throttler instance
    this.throttler = new Throttler(); 
    // The redis client instance
    this.redis = null;
    // Enable / disable cache 
    this.cache = false;
    // the default cache expiration (1 day):
    this.cacheTTL = 0;
    // list of user agents, with provided defaults
    this.userAgents = [];
    
    // ProxyPool
    this.proxyPool = new ProxyPool(); 
  }

  init(config: MainConfig = {}) {
    const {
      pool = {},
      throttle = {},
      userAgents = DEAFULT_USER_AGENTS,
      redis = null,
      cache = false,
      cacheTTL = 86400
    } = config;
    // Setup the proxy pool
    this.proxyPool = new ProxyPool(pool); 
    this.proxyPool.compose(); 
    // Setup the throttler 
    this.throttler = new Throttler(throttle);
    // Configure the main module 
    this.userAgents = userAgents;
    this.redis = redis;
    this.cache = (cache && !!redis); 
    this.cacheTTL = cacheTTL,
    this.initComplete = true;
    logger.info('Discreet requests are enabled');
  }

  /**
   * @description Sends a formatted response 
   */
  sendResponse(res: Partial<DiscreetResponse>): DiscreetResponse {
    const {
      body = '',
      statusCode = null,
      cached = false,
      raw = null
    } = res; 
    return { body, statusCode, cached, raw};
  }

  /**
   * getRandomUserAgent
   * @description returns a random userAgent from this list of user agents
   */
  getRandomUserAgent(): Nullable<string> {
    if (this.userAgents.length > 0) {
      const index = Math.floor(Math.random() * Math.floor(this.userAgents.length - 1));
      return this.userAgents[index];
    }
    return null
  }

  /**
   * @description stores the data returned from an endpoint in the redis cache.
   *              Since we don't immediately need this can be safely be done async.
   */
  async setEndpointCache(endpoint: string, data: any): Promise<void> {
    logger.info(`Setting endpoint data to cache: ${endpoint}`);
    // check to make sure that redis is configured
    if (this.redis) {
      logger.info(`Caching Endpoint: ${endpoint}`);
      await this.redis.set(endpoint, data.toString(), 'EX', this.cacheTTL);
    } else {
      throw new RedisError('No redis instance is configred, cannot cache request'); 
    }
  }

  /**
   * @description loads the cached endpoint data
   */
  async loadEndpointCache(endpoint: string): Promise<Nullable<string>> {
    if (!this.redis) return null;
    else {
      const data = await this.redis.get(endpoint);
      logger.info(`[CACHE]: Loading endpoint from cache: ${endpoint}: ${data}`);
      if (data === null) return null;
      return data;
    }
  }

  buildOptions () {
    const options: RequestOptions = {}; 
    let userAgent = this.getRandomUserAgent();
    let proxyUrl = this.proxyPool.getProxy();
    if (userAgent !== null) {
      options.headers = { 'User-Agent': userAgent };
    }
    if (proxyUrl !== null) {
      options.proxy = proxyUrl;
    }
    return options; 
  }

  /**
   * @description generates the discreet request without cache
   * @param {string} url -the url to request data from
   * @param {object} requestOptions - request object to be forwarded to the node request library
   */
  async request(url: string, requestOptions: RequestOptions = {}, fromCache = this.cache) {
    if (!this.initComplete) {
      logger.warn('You must first init the discreet instance before making a request calling discreet.init(...)');
      throw new RequestError('Discreet was not initialized');
    }
    // Fetch the endpoint cache 
    if (fromCache) { 
      const data = await this.loadEndpointCache(url); 
      if (data) return this.sendResponse({ body: data, cached: true });
    }
    // Build the request options
    const options = {...requestOptions, ...this.buildOptions()}; 
    // Generate the throttled request 
    logger.info(`Generating discreet request to ${url} with ${options.proxy}`);
    const result = await this.throttler.queue(url, options);
    const { err, response, body } = result;
    // Handle the request errors
    if (err) {
      logger.error(err);
      throw new NetworkError(`Could not complete request to ${url}`);
    } else if (response && response.statusCode === 407) {
      throw new ProxyError('Could not authenticate with the proxy');
    }
    // Cache the response, if enabled
    if (this.cache) {
      await this.setEndpointCache(url, body);
    }
    // Send the discreet response
    return this.sendResponse({ body, statusCode: response.statusCode, raw: response});
  }
  
}

export default DiscreetRequest;