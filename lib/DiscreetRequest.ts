import { RedisClient } from "redis";

import ProxyPool from "./ProxyPool";
import Throttler from "./Throttler";
import DEAFULT_USER_AGENTS from './util/userAgents';
import { NetworkError, ProxyError, RedisError } from "./util/error";

import type { Nullable, MainConfig, RequestOptions, DiscreetResponse } from "./types";


class DiscreetRequest {

  private initComplete: boolean;

  redis: Nullable<RedisClient>;

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
    // the redis client instance
    this.redis = null;
    // the default cache expiration (1 day):
    this.cacheTTL = 0;
    // list of user agents, with provided defaults
    this.userAgents = [];
    // ProxyPool
    this.proxyPool = new ProxyPool(); 
  }

  init(config: MainConfig) {
    const {
      pool = {},
      thottle = {},
      userAgents = DEAFULT_USER_AGENTS,
      redis = null,
      cacheTTL = 86400
    } = config;
    // Setup the proxy pool
    this.proxyPool = new ProxyPool(pool); 
    this.proxyPool.compose(); 
    // Setup the throttler 
    this.throttler = new Throttler(thottle);
    // Configure the main module 
    this.userAgents = userAgents;
    this.redis = redis;
    this.cacheTTL = cacheTTL,
    this.initComplete = true;
    console.info('Discreet requests are enabled');
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
  cacheEndpoint(endpoint: string, data: any): void {
    // check to make sure that redis is configured
    if (this.redis) {
      console.info(`Caching Endpoint: ${endpoint}`);
      this.redis.set(endpoint, data.toString(), 'EX', this.cacheTTL);
    }
  }

  /**
   * @description loads the cached endpoint data
   */
  loadEndpointCache(endpoint: string): Promise<Nullable<string>> {
    return new Promise((resolve, reject) => {
      if (this.redis) {
        this.redis.get(endpoint, (err: Nullable<Error>, data: string) => {
          if (err) reject(err);
          else if (data !== null) {
            console.info(`Loading endpoint from cache: ${endpoint}`);
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
    async cachedRequest(url: string , requestOptions={}) {
      if (this.redis) {
        const data = await this.loadEndpointCache(url);
        if (data !== null) {
          let response = {
            body: data,
            statusCode: null,
            cached: true,
            raw: null
          };
          return response;
        } else {
          const response = await this.request(url, requestOptions);
          this.cacheEndpoint(url, response.body);
        }
      } else {
        console.warn('Redis is not configured for cached request');
        throw new Error('ERROR: Redis not configured.');
      }
    }

  /**
   * @description generates the discreet request without cache
   * @param {string} url -the url to request data from
   * @param {object} requestOptions - request object to be forwarded to the node request library
   */
  async request(url: string, requestOptions: RequestOptions = {}) {
    if (!this.initComplete) {
      console.warn('You must first init the discreet instance before making a request calling discreet.init(...)');
      throw new ProxyError('Discreet was not initialized');
    }
    let userAgent = this.getRandomUserAgent();
    let proxyUrl = this.proxyPool.getProxy();
    if (userAgent !== null) {
      requestOptions.headers = { 'User-Agent': userAgent };
    }
    if (proxyUrl !== null) {
      requestOptions.proxy = proxyUrl;
      console.info(`Creating discreet request with proxy address ${proxyUrl}`);
    }
    const result = await this.throttler.queue(url, requestOptions);
    const { err, response, body } = result;
    if (err) {
      console.error(err);
      throw new NetworkError(`Could not complete request to ${url}`);
    } else if (response && response.statusCode === 407) {
      throw new ProxyError('Could not authenticate with the proxy');
    } else {
      let formattedResponse: DiscreetResponse = {
        body: body,
        statusCode: response.statusCode,
        cached: false,
        raw: response
      };
      return formattedResponse;
    }
  }
  
}

export default DiscreetRequest;