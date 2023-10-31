import Throttler from "./Throttler";
import logger from "../util/logger";

import { 
  InstanceProperties, 
  Nullable, 
  Proxy, 
  RequestProtocol, 
  StatusCode
} from "../types";



export type ProxyPoolConfig = InstanceProperties<ProxyPool>;

class ProxyPool {

  throttler: Throttler;

  proxies: Proxy[]; 
  
  proxyAuth: Nullable<{ username: string, password: string }>;
  
  protocol: RequestProtocol;
  
  pool: Proxy[]; 
  
  index: number; 
  
  refreshRate: number;
  
  targetEndpoint: string; 
  
  failureCases: StatusCode[];
  
  refreshProxies: boolean; 

  interval: Nullable<NodeJS.Timeout>;

  constructor(config: ProxyPoolConfig = {}) {
    // Set configuration default values
    const {
      proxies = [],
      proxyAuth = null,
      targetEndpoint = 'http://bing.com',
      failureCases = [407, 403, 408],
      refreshProxies = false,
      refreshRate = 300000,
      protocol = 'http'
    } = config;
    // The request throttler
    this.throttler = new Throttler(); 
    // the proxies
    this.proxies = proxies;
    // the proxy authentication
    this.proxyAuth = proxyAuth;
    // the protocol to use for the proxies
    this.protocol = protocol;
    // the pool of healthy proxies
    this.pool = [];
    // the current proxy index (makes sure proxies are rotated in order)
    this.index = 0;
    // how often to refresh the proxeies (default is 1 hour)
    this.refreshRate = refreshRate;
    // the endpoint to use to test the proxies
    this.targetEndpoint = targetEndpoint;
    // the status codes for which indicate a dead/inoperable proxy
    this.failureCases = failureCases;
    // flag to determine if proxies should be refreshed
    this.refreshProxies = refreshProxies;
    // the test interval 
    this.interval = null; 
  }

  /**
   * @description gets a full proxy url
   * @returns {(string | null)} fullProxyUrl - the full proxy url with protocol
   */
  buildProxyUrl(proxy: Proxy): string {
    if (this.proxyAuth) {
      return `${this.protocol}://${this.proxyAuth.username}:${this.proxyAuth.password}@${proxy}`;
    } else { 
      return `${this.protocol}://${proxy}`;
    }
  }

  /**
   * @description get a lits of healthy proxies and start testing intervals
   */
  async compose() {
    if (this.refreshProxies) {
      // Test the initial proxies
      await this.test(); 
      // Set up the testing interval to refresh proxy statuses
      this.interval = setInterval(() => {
        // Reset the pool index after a refresh (since the pool size may change)
        this.index = 0; 
        this.test();
      }, this.refreshRate);
    } else { 
      // If we aren't refreshing proxies, assume they are all healthy
      this.pool = this.proxies;
    }
  };

  /**
   * @description clears the composed test interval
   */
  close() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null; 
    }
    this.pool = []; 
  }

  /**
   * @description tests the entire list of proxies against the target endpoints
   */
  async test(): Promise<void> {
    this.pool = []; 
    logger.info(`Testing proxies`);
    for (const proxy of this.proxies) {
      const proxyUrl = this.buildProxyUrl(proxy);
      const requestOptions = { 
        proxy: proxyUrl, 
        method: 'GET'
      }
      const result = await this.throttler.queue(this.targetEndpoint, requestOptions);
      const {err, response } = result;
      if (err) {
        logger.error(err);
      } else if (response) {
        const { statusCode, statusMessage } = response; 
        if (this.failureCases.includes(statusCode)) {
          logger.warn(`Proxy ${proxy} failed health test with status code ${statusCode} ${statusMessage} `)
        } else {
          this.pool.push(proxy);
          logger.info(`Proxy ${proxy} passed health test with status code ${statusCode} ${statusMessage}`);
        }
      }
    }
  }; 

  /**
   * @description returns a healthy proxy
   * @returns {(string|null)} proxy - either a proxy string or null, if there are no health proxies
   */
  getProxy(): Nullable<string> {
    if (this.pool.length === 0) return null; 
    const proxy = this.pool[this.index]; 
    if (this.index < (this.pool.length - 1)) {
      this.index++; 
    } else { 
      this.index = 0; 
    }
    return this.buildProxyUrl(proxy);;
  }

}

export default ProxyPool; 