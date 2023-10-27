import { Response } from "../types";
import ProxyPool from "../lib/ProxyPool";
import { ProxyPoolConfig } from "../lib/ProxyPool";

// Mock HTTP responses: 
import mockResponses from "./__mocks/responses";


describe('#ProxyPool', () => {


  const defaultConfig: ProxyPoolConfig = {
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
    refreshProxies: false,
    refreshRate: 3700000,
    protocol: 'http'
  };

  afterEach(() => {
    jest.clearAllMocks(); 
    jest.resetModules(); 
  }); 

  /**
   * Utility function to mock the throttler queue (i.e. network request)
   * @param pool 
   * @param key 
   * @returns 
   */
  const mockThrottler = (pool: ProxyPool, key: string) => {
    return jest
    .spyOn(pool.throttler, 'queue')
    .mockImplementation((...args: any[]): Promise<Response> => {
      const response = {
        err: null,
        response: mockResponses[key],
        body: mockResponses[key].body,
      } as Response;
      return Promise.resolve(response);
    });
  }

  describe('#constructor', () => {
    it('should create a new instance of the ProxyPool class with provided options', () => {
      const config = defaultConfig; 
      let proxyPool = new ProxyPool(config);
      expect(proxyPool.proxies).toEqual(config.proxies);
      expect(proxyPool.targetEndpoint).toEqual(config.targetEndpoint);
      expect(proxyPool.failureCases).toEqual(config.failureCases);
      expect(proxyPool.refreshRate).toEqual(config.refreshRate);
      expect(proxyPool.protocol).toEqual(config.protocol);
    });
    it('should create a new instance of the ProxyPool calss with no provided optinos', () => {
      let proxyPool = new ProxyPool();
      expect(proxyPool.proxies).toBeInstanceOf(Array);
      expect(proxyPool.proxies.length).toBe(0);
      expect(proxyPool.proxyAuth).toBeNull();
      expect(proxyPool.pool).toBeInstanceOf(Array);
      expect(proxyPool.pool.length).toBe(0);
      expect(proxyPool.targetEndpoint).toBe('http://bing.com');
      expect(proxyPool.protocol).toBe('http');
    });
  }); 

  describe('#compose', () => {
    it('should refresh the proxies and compose the pool', async () => {
      const config = { ...defaultConfig };
      config.refreshProxies = true;
      const proxyPool = new ProxyPool(config);
      const runProxyTestsSpy = jest
        .spyOn(proxyPool, 'test')
        .mockImplementation(() => Promise.resolve()); 
      await proxyPool.compose();
      expect(runProxyTestsSpy).toHaveBeenCalledTimes(1);
      proxyPool.close(); 
    });
    it('should not refresh the proxies on interval and compose the pool', async () => {
      const config = { ...defaultConfig };
      const proxyPool = new ProxyPool(config);
      const runProxyTestsSpy = jest
        .spyOn(proxyPool, 'test')
        .mockImplementation(() => Promise.resolve()); 
      await proxyPool.compose();
      expect(runProxyTestsSpy).not.toHaveBeenCalled();
      expect(proxyPool.pool).toEqual(config.proxies);
      proxyPool.close(); 
    });
  }); 

  describe('#close', () => {
    it('should stop the proxy refresh interval ', () => {
      const config = { ...defaultConfig };
      config.refreshProxies = true;
      const proxyPool = new ProxyPool(config);
      jest.spyOn(proxyPool, 'test').mockImplementation(() => Promise.resolve()); 
      proxyPool.compose();
      proxyPool.close(); 
      expect(proxyPool.interval).toBeNull(); 
    });
  }); 

  describe('#buildProxyUrl', () => {
    it('should build a valid URL with protocol authentication', () => {
      const proxy = '123.12.34.12:80';
      const config = { ...defaultConfig };
      config.protocol = 'https';
      const proxyPool = new ProxyPool(config);
      const proxyUrl = proxyPool.buildProxyUrl(proxy);
      const expectedUrl = `${config.protocol}://${config?.proxyAuth?.username}:${config?.proxyAuth?.password}@${proxy}`;
      expect(proxyUrl).toBe(expectedUrl);
    });
  
    it('should build a valid URL without authentication when none is provided', () => {
      const proxy = '123.12.34.12:80';
      const config = { ...defaultConfig, proxyAuth: null };
      const proxyPool = new ProxyPool(config);
      const proxyUrl = proxyPool.buildProxyUrl(proxy);
      const expectedUrl = `http://${proxy}`;
      expect(proxyUrl).toBe(expectedUrl);
    });
  
  }); 

  describe('#test', () => {
    const proxies = defaultConfig.proxies || [];

    it('should test all of the proxies', async () => {
      const proxyPool = new ProxyPool(defaultConfig);
      const proxyUrls = proxies.map((proxy) => proxyPool.buildProxyUrl(proxy));
      const throttler = mockThrottler(proxyPool, 'success'); 
      await proxyPool.test();
      expect(throttler).toHaveBeenCalledTimes(proxies.length);
      throttler.mock.calls.forEach((call, index) => {
        expect(call[1].proxy).toBe(proxyUrls[index]);
      });
    });

    it('should add healthy proxies to the pool', async () => {
      const proxyPool = new ProxyPool(defaultConfig);
      const throttler = mockThrottler(proxyPool, 'success');
      proxyPool.test();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(proxyPool.pool.length).toBe(proxies.length);
    });
  
    it('should not add dead proxies to the pool', async () => {
      const proxyPool = new ProxyPool(defaultConfig);
      // In this case, the server responds with 403 forbidden which indicates a dead proxy
      const throttler = mockThrottler(proxyPool, 'forbidden');
      proxyPool.test();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(proxyPool.pool.length).toBe(0);
    });

    it('should not mark proxies as dead if response code does not match failure cases', async () => {
      const proxyPool = new ProxyPool(defaultConfig);
      // In this case, the server responds with 404 not found, which does not indicate 
      // a dead proxy
      const throttler = mockThrottler(proxyPool, 'notFound');
      proxyPool.test();
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(proxyPool.pool.length).toBe(proxies.length);
    });


  })

  describe('#getProxy', () => {

    const config = {...defaultConfig, proxyAuth: null };

    const proxyPool = new ProxyPool(config);
    const proxies = defaultConfig.proxies || [];
    proxyPool.compose(); 

    it('should return the next available proxy in the pool', () => {
      proxies.forEach((proxy, i) => {
        const proxyUrl = proxyPool.getProxy(); 
        expect(proxyUrl).toEqual(`http://${proxies[i]}`);
      })
    }); 

    it('should return null if there are no proxies in the pool', () => {
      proxyPool.pool = []; 
      const proxyUrl = proxyPool.getProxy();
      expect(proxyUrl).toBeNull();
    });
  }); 


}); 