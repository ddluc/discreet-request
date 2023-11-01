import DiscreetRequest from "../lib/DiscreetRequest";
import ProxyPool from "../lib/ProxyPool";
import Throttler from "../lib/Throttler";
import { MainConfig } from "../types";
import DEFAULT_USER_AGENTS from '../util/userAgents';
import mockRedisClient from './__mocks/redis';
import mockResponses from "./__mocks/responses";
import { Response } from "../types";
import { RequestError } from "../util/error";

const fail = (message: string) => {
  throw new Error(`Test Failed: ${message}`);
};

describe('DiscreeetRequest', () => {

  const defaultConfig: MainConfig = {
    pool: {
      proxies: [
        '192.168.1.100',
        '10.0.0.1',
        '172.16.0.100',
        '203.0.113.5',
        '87.65.43.21'
      ],
      targetEndpoint: 'http://mytestendpoint.com',
      proxyAuth: {
        username: 'username',
        password: 'pass'
      },
      failureCases: [407, 403],
      refreshInterval: 36000,
      refreshProxies: false,
      refreshRate: 3600000,
      protocol: 'http'
    }, 
    throttle: {
      count: 3, 
      milliseconds: 10000
    },
    redis: mockRedisClient,
    cache: false,
    cacheTTL: 60000,
    userAgents: DEFAULT_USER_AGENTS
  }


  /**
   * Utility function to mock the throttler queue (i.e. network request)
   * @param pool 
   * @param key 
   */
  const mockThrottler = (discreet: DiscreetRequest, key: string) => {
    return jest
    .spyOn(discreet.throttler, 'queue')
    .mockImplementation((...args: any[]): Promise<Response> => {
      const response = {
        err: null,
        response: mockResponses[key],
        body: mockResponses[key].body,
      } as Response;
      return Promise.resolve(response);
    });
  }

  afterEach(() => {
    jest.clearAllMocks(); 
    jest.resetModules(); 
  }); 

  describe('#constructor', () => {
    it ('should instantiate a new Discreet Request class', () => {
      let discreet = new DiscreetRequest(); 
      expect(discreet).toBeInstanceOf(DiscreetRequest);
    });
  });

  describe('#init', () => {
    let discreet = new DiscreetRequest();
    it('should set the default values for all configuration options that are not defined', async () => {
      await discreet.init(); 
      // Verify proxy Pool config
      expect(discreet.proxyPool).toBeInstanceOf(ProxyPool);
      expect(discreet.proxyPool.proxies).toEqual([]);
      expect(discreet.proxyPool.proxyAuth).toEqual(null);
      // Verify Throttler Config
      expect(discreet.throttler).toBeInstanceOf(Throttler);
      expect(discreet.throttler.count).toEqual(1);
      expect(discreet.throttler.milliseconds).toEqual(1000);
      // Verify Redis config 
      expect(discreet.redis).toEqual(null); 
      expect(discreet.cacheTTL).toEqual(86400);
    });
    it('should configure the instance with the user configuration options', async () => {
      await discreet.init(defaultConfig); 
      // Verify proxy Pool config
      expect(discreet.proxyPool).toBeInstanceOf(ProxyPool);
      expect(discreet.proxyPool.proxies).toEqual(defaultConfig?.pool?.proxies);
      expect(discreet.proxyPool.proxyAuth).toEqual(defaultConfig.pool?.proxyAuth);
      // Verify Throttler Config
      expect(discreet.throttler).toBeInstanceOf(Throttler);
      expect(discreet.throttler.count).toEqual(defaultConfig?.throttle?.count);
      expect(discreet.throttler.milliseconds).toEqual(defaultConfig?.throttle?.milliseconds);
      // Verify Redis config 
      expect(discreet.redis).toEqual(defaultConfig.redis); 
      expect(discreet.cacheTTL).toEqual(defaultConfig.cacheTTL);
    }); 
  }); 

  describe('#request', () => {

    let discreet: DiscreetRequest; 

    beforeEach(async () => {
      discreet = new DiscreetRequest();
      await discreet.init(defaultConfig);
    });


    it('should make a request to the provided url with a proxy and user agent', async () => {
      const throttler = mockThrottler(discreet, 'success');
      let endpoint = 'http://mytestendpoint.com';
      const options = { method: 'PUT'};
      const response = await discreet.request(endpoint, options);
      // Verify the throttler call
      const url = throttler.mock.calls[0][0];
      const { method } = throttler.mock.calls[0][1];
      expect(url).toEqual(endpoint);
      expect(method).toEqual('PUT');
      // Verify the response 
      const  { success } = mockResponses;
      expect(response).toEqual({ 
        cached: false, 
        statusCode: success.statusCode,
        body: success.body, 
        raw: success 
      })
    });

    it('should automatically configure the user agent', async () => {
      const throttler = mockThrottler(discreet, 'success');
      let endpoint = 'http://mytestendpoint.com';
      const options = { method: 'PUT'};
      await discreet.request(endpoint, options);
      // Verify the request user agent
      const { headers = {} } = throttler.mock.calls[0][1];
      expect(headers['User-Agent']).toBeDefined(); 
    }); 

    it('should automatically assign a proxy', async () => {
      const throttler = mockThrottler(discreet, 'success');
      let endpoint = 'http://mytestendpoint.com';
      const options = { method: 'PUT'};
      await discreet.request(endpoint, options);
      // Verify the configured proxy
      const { proxy } = throttler.mock.calls[0][1];
      const proxyUrl = `http://${defaultConfig?.pool?.proxyAuth?.username}:${defaultConfig?.pool?.proxyAuth?.password}@${discreet.proxyPool.proxies?.shift()}`;
      expect(proxy).toEqual(proxyUrl); 
    }); 

    it ('should automatically fetch the data from cache, if it exists', async () => {
      const throttler = mockThrottler(discreet, 'success');
      let endpoint = 'http://mytestendpoint.com';
      const options = { method: 'PUT'};
      const response = await discreet.request(endpoint, options, true);
      expect(response.cached).toEqual(true);
      expect(response.body).toEqual('cached-data');
      expect(response.statusCode).toBeNull(); 
      expect(response.raw).toBeNull(); 
    }); 
    
    it('it should throw a RequestError if you attempt to make a request before .init() is called on the instance', async () => {
      discreet = new DiscreetRequest();
      const throttler = mockThrottler(discreet, 'success');
      try {
        let endpoint = 'http://mytestendpoint.com';
        const options = { method: 'PUT'};
        const response = await discreet.request(endpoint, options, true);
      } catch(err) {
        if (err instanceof Error) expect(err?.name).toEqual('RequestError');
        else {
          fail('it should throw a request error');
        }
      }
    });

    it('should throw a ProxyError if the authentication to the proxy is unsuccessful', async () => {
      discreet = new DiscreetRequest();
      await discreet.init(); 
      const throttler = mockThrottler(discreet, 'proxyError');
      try {
        let endpoint = 'http://mytestendpoint.com';
        const options = { method: 'PUT'};
        const response = await discreet.request(endpoint, options, true);
      } catch(err) {
        if (err instanceof Error) expect(err?.name).toEqual('ProxyError');
        else {
          fail('it should throw a request error');
        }
      }
    });

    it('should throw a NetworkError if there is an error in the request', async () => {
      discreet = new DiscreetRequest();
      await discreet.init(defaultConfig); 
      const throttler = mockThrottler(discreet, 'serverError');
      try {
        let endpoint = 'http://mytestendpoint.com';
        const options = { method: 'PUT' };
        const response = await discreet.request(endpoint, options, true);
      } catch(err) {
        if (err instanceof Error) expect(err?.name).toEqual('NetworkError');
        else {
          fail('it should throw a request error');
        }
      }
    });

    it('should throw a proxy error if there are no available proxies', async () => {
      discreet = new DiscreetRequest();
      await discreet.init(); 
      const throttler = mockThrottler(discreet, 'success');
      try {
        let endpoint = 'http://mytestendpoint.com';
        const options = { method: 'PUT'};
        await discreet.request(endpoint, options);
      } catch(err) {
        if (err instanceof Error) expect(err?.name).toEqual('ProxyError');
        else {
          fail('it should throw a request error');
        }
      }
    });

    it('should cache the request if the cache is enabled', async () => {
      discreet = new DiscreetRequest();
      await discreet.init({ ...defaultConfig, cache: true, redis: mockRedisClient }); 
      const throttler = mockThrottler(discreet, 'success');
      const redis = discreet.redis || mockRedisClient; 
      const set = jest.spyOn(redis, 'set'); 
      let endpoint = 'http://mytestendpoint.com';
      const options = { method: 'PUT'};
      await discreet.request(endpoint, options, false);
      expect(set).toHaveBeenCalled(); 
    });

  });


});