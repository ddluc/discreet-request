import DiscreetRequest from "../lib/DiscreetRequest";
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
    proxies: [
      '192.168.1.100',
      '10.0.0.1',
      '172.16.0.100',
      '203.0.113.5',
      '87.65.43.21'
    ],
    proxyAuth: {
      username: 'username',
      password: 'pass'
    },
    failureCases: [407, 403],
    protocol: 'http',
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
      discreet.throttler.stop(); 
    });
  });

  describe('#init', () => {
    
    let discreet: DiscreetRequest; 

    beforeEach(() => {
      discreet = new DiscreetRequest();
    }); 

    afterEach(() => {
      discreet.throttler.stop(); 
    });

    it('should set the default values for all configuration options that are not defined', async () => {
      await discreet.init(); 
      // Verify proxy Pool config
      expect(discreet.proxies).toEqual([]);
      expect(discreet.proxyAuth).toEqual(null);
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
      expect(discreet.proxies).toEqual(defaultConfig?.proxies);
      expect(discreet.proxyAuth).toEqual(defaultConfig?.proxyAuth);
      // Verify Throttler Config
      expect(discreet.throttler).toBeInstanceOf(Throttler);
      expect(discreet.throttler.count).toEqual(defaultConfig?.throttle?.count);
      expect(discreet.throttler.milliseconds).toEqual(defaultConfig?.throttle?.milliseconds);
      // Verify Redis config 
      expect(discreet.redis).toEqual(defaultConfig.redis); 
      expect(discreet.cacheTTL).toEqual(defaultConfig.cacheTTL);
    }); 
  }); 

  describe('#sendResponse', () => {
    it.todo('should send the formatted response'); 
  }); 

  describe('#isProxOperable', () => {
    it.todo('should determine whether the proxy is operable');
  }); 

  describe('#removeProxy', () => {
    it.todo('should remove the provided proxy'); 
    it.todo('should not remove the provided proxy if it does not exist');
  }); 

  describe('#getRandomUserAgent', () => {
    it.todo('should get a random user agent');
  }); 

  describe('#buildProxyUrl', () => {

    let discreet: DiscreetRequest; 

    beforeEach(() => {
      discreet = new DiscreetRequest();
    }); 

    afterEach(() => {
      discreet.throttler.stop(); 
    }); 
    
    it('should build a valid URL with protocol authentication', () => {
      const config = { ...defaultConfig };
      const proxy = '123.12.34.12:80';
      discreet.init(config);
      const proxyUrl = discreet.buildProxyUrl(proxy);
      const expectedUrl = `${config.protocol}://${config?.proxyAuth?.username}:${config?.proxyAuth?.password}@${proxy}`;
      expect(proxyUrl).toBe(expectedUrl);
    });
  
    it('should build a valid URL without authentication when none is provided', () => {
      const config = { ...defaultConfig, proxyAuth: null };
      const proxy = '123.12.34.12:80';
      discreet.init(config);
      const proxyUrl = discreet.buildProxyUrl(proxy);
      const expectedUrl = `http://${proxy}`;
      expect(proxyUrl).toBe(expectedUrl);
    });
  
  }); 

  describe('#getProxy', () => {

    let discreet: DiscreetRequest; 
    const config = {...defaultConfig, proxyAuth: null };

    beforeEach(() => {
      discreet = new DiscreetRequest();
      discreet.init(config);
    }); 

    afterEach(() => {
      discreet.throttler.stop(); 
    }); 

    it('should return the get next available proxy in the pool', () => {
      const proxies = [...discreet.pool];
      for (const p of proxies) {
        const { proxy, url: proxyUrl} = discreet.getProxy(); 
        expect(proxy).toEqual(p);
        expect(proxyUrl).toEqual(`${config.protocol}://${p}`); 
      }
    }); 

    it('should return null if there are no proxies in the pool', () => {
      discreet.pool = []; 
      const { proxy, url: proxyUrl} = discreet.getProxy(); 
      expect(proxy).toBeNull();
      expect(proxyUrl).toBeNull();
    });
  });

  describe('#setEndpointCache', () => {
    it.todo('should set the endpoint response to cache'); 
  }); 

  describe('#getEndpointCache', () => {
    it.todo('should get the endpoint response from cache'); 
  }); 

  describe('#compose', () => {
    it.todo('should compose the pool of healthy proxies'); 
    it.todo('should not add inoperable proxies to the pool'); 
  }); 

  describe('#request', () => {

    let discreet: DiscreetRequest; 

    beforeEach(async () => {
      discreet = new DiscreetRequest();
      discreet.init(defaultConfig);
    });

    afterEach( async () => {
      discreet.throttler.stop(); 
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
      const requestOptions = throttler.mock.calls[0][1];
      const auth = defaultConfig?.proxyAuth;
      const proxy = discreet.pool[0]; 
      const proxyUrl = `http://${auth?.username}:${auth?.password}@${proxy}`;
      expect(requestOptions.proxy).toEqual(proxyUrl); 
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