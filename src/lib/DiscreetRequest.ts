
import Throttler from "./Throttler";
import DEAFULT_USER_AGENTS from '../util/userAgents';
import { NetworkError, RequestError, ProxyError, RedisError } from "../util/error";
import logger from "../util/logger";

import type { 
  RedisClient, 
  Nullable, 
  MainConfig, 
  RequestOptions, 
  DiscreetResponse, 
  StatusCode, 
  Proxy, 
  RequestProtocol,
} from "../types";


class DiscreetRequest {

  proxies: Proxy[]; 
  
  proxyAuth: Nullable<{ username: string, password: string }>;
  
  protocol: RequestProtocol;

  index: number;
  
  pool: Proxy[]; 

  failureCases: StatusCode[];

  maxRetries: number;

  redis: Nullable<RedisClient>;

  cache: boolean;

  cacheTTL: number; 

  userAgents: string[];

  throttler: Throttler;

/**
 * @description sets the default options for the DiscreetRequest instance
 */
  constructor(config: MainConfig, throttler?: Throttler) {
    const {
      throttle = {},
      userAgents = DEAFULT_USER_AGENTS,
      redis = null,
      cache = false,
      cacheTTL = 86400,
      proxies = [],
      proxyAuth = null,
      failureCases = [407, 403, 408, 401, 418],
      maxRetries = 3,
      protocol = 'http',
    } = config;
    // Setup the throttler (with optional dependency injection for tests)
    this.throttler = throttler || new Throttler(throttle);
    // The users proxies
    this.proxies = proxies; 
    // The pool of healthy proxies
    this.pool = this.proxies;
    // The pool index
    this.index = 0;
    // the proxy authentication
    this.proxyAuth = proxyAuth; 
    // The list of HTTP status codes which indicate a dead proxy
    this.failureCases = failureCases; 
    // The max number of retries on a request with a failed proxy
    this.maxRetries = maxRetries; 
    // the protocol to use for the proxies
    this.protocol = protocol; 
    // list of user agents, with provided defaults
    this.userAgents = userAgents;
    // The redis client instance
    this.redis = redis;
    // Enable / disable cache 
    this.cache = (cache && !!redis); 
    // the default cache expiration (1 day):
    this.cacheTTL = cacheTTL;

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
   * Determines whether the proxy is operable based on the request response
   */
  isProxyOperable(statusCode: StatusCode) {
    if (this.failureCases.includes(statusCode)) return false; 
    return true;
  } 

  /**
   * Removes a proxy from the pool if it's deemed inoperable
   */
  removeProxy(proxy: Proxy, code: number | string) {
    if (!this.pool.includes(proxy)) return; 
    logger.warn(`Dropping proxy: ${proxy} with code ${code}`);
    this.pool = this.pool.filter(p => p !== proxy);
    logger.warn(`Remaining available proxies: ${this.pool.length}`);
  } 

  /**
   * @description gets a full proxy url
   * @returns {(string | null)} fullProxyUrl - the full proxy url with protocol
   */
  buildProxyUrl(proxy: Proxy): string {
    if (this.proxyAuth) {
      return `${this.protocol}://${this.proxyAuth.username}:${this.proxyAuth.password}@${proxy}`;
    }
    return `${this.protocol}://${proxy}`; 
  }

  /**
   * @description returns a healthy proxy
   * @returns {(string|null)} proxy - either a proxy string or null, if there are no health proxies
   */
  getProxy(): { proxy: Nullable<Proxy>, url: Nullable<string>} {
    if (this.pool.length === 0) return { proxy: null, url: null }; 
    let url = null; 
    if (this.index  >= this.pool.length) this.index = 0; 
    // Grab the first available proxy 
    const proxy = this.pool[this.index]; 
    // If there is an available proxy, build
    if (proxy) {
      url = this.buildProxyUrl(proxy);
    }
    this.index++; 
    return  { proxy, url }
  }

  /**
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
   * @description 
   * Stores the data returned from an endpoint in the redis cache.
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

  /**
   * @description tests the entire list of proxies against a target endpoint
   */
  async compose(url: string, requestOptions: RequestOptions = {}): Promise<void> {
    this.pool = []; 
    logger.dev(`Composing proxy pool...`);
    for (const proxy of this.proxies) {
      const proxyUrl = this.buildProxyUrl(proxy);
      // Build the request options
      const options: RequestOptions = {
        proxy: proxyUrl,
        headers: { 'User-Agent': this.getRandomUserAgent(), ...requestOptions.headers },
        ...requestOptions
      }; 
      const result = await this.throttler.queue(url, options);
      const {err, response: { statusCode, statusMessage} } = result; 
      if (err) { 
        logger.error(`Unexpected Network Error`);
        continue; 
      }
      if (this.isProxyOperable(statusCode)) {
        this.pool.push(proxy);
        logger.info(`Proxy ${proxy} passed health test with status code ${statusCode} ${statusMessage}`);
      } else { 
        logger.warn(`Proxy ${proxy} failed health test with status code ${statusCode} ${statusMessage} `)
      }
    }
  }; 

  /**
   * @description generates the discreet request without cache
   * @param {string} url -the url to request data from
   * @param {object} requestOptions - request object to be forwarded to the node request library
   */
  async request(url: string, requestOptions: RequestOptions = {}, fromCache = this.cache, attempt=1): Promise<DiscreetResponse> {
    // Fetch the endpoint cache 
    if (fromCache) { 
      const data = await this.loadEndpointCache(url); 
      if (data) return this.sendResponse({ body: data, cached: true });
    }
    // Fetch a proxy from the pool
    const { proxy = null, url: proxyUrl = null } = this.getProxy();
    // Verify available proxies
    if (!proxyUrl) {
      logger.error('No Proxies available');
      throw new ProxyError('No proxies available');
    }
    // Build the request options
    const options: RequestOptions = {
      proxy: proxyUrl,
      headers: { 'User-Agent': this.getRandomUserAgent(), ...requestOptions.headers },
      ...requestOptions
    }; 
    // Generate the throttled request 
    const result = await this.throttler.queue(url, options);
    const { err, response, body } = result;
    // Handle the request errors
    if (err) throw new NetworkError(`Could not complete request to ${url}: ${err}`);
    // If the proxy fails, remove it from the pool
    if (proxy && !this.isProxyOperable(response.statusCode)) {
      this.removeProxy(proxy, response.statusCode);
      if (attempt >= 3) {
        logger.info(`Max retries hit for ${url}`);
        // Send the discreet response
        return this.sendResponse({ body, statusCode: response.statusCode, raw: response});
      } else {
        // Retry the request
        logger.dev(`Retrying request to ${url}`);
        return this.request(url, requestOptions, fromCache, attempt + 1); 
      }
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