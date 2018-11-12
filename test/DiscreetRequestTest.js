const fs = require('fs'),
      assert = require('assert'),
      sinon = require('sinon');

const DiscreetRequest = require('../lib/DiscreetRequest');
      ProxyPool = require('../lib/ProxyPool'),
      Throttler = require('../lib/Throttler'),
      error = require('../util/error'),
      defaultUserAgents = require('../util/userAgents'),
      mockResponses = require('./mockResponses');

module.exports = function() {

  describe('DiscreetRequest', () => {

    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

   let defaultOptions = {
     proxies,
     proxyPoolConfig: { testProxies: false },
     throttleConfig: {
       requests: 1,
       milliseconds: 600
     },
     proxyAuth: {
       username: 'ddluc',
       password: 'test'
     },
     redis: {
       get: (endpoint) => true,
       set: (endpoint, body) => true
     },
     userAgents: defaultUserAgents
   };

    describe('#constructor', () => {
      let discreet = new DiscreetRequest();
      it('should instantiate a new Discreet Request class with default values', () => {
        assert(discreet instanceof DiscreetRequest);
      });
    });

    describe('#init', () => {
      let discreet = new DiscreetRequest();
      it('should set the default values for all configuration options that are not defined', () => {
        discreet.init();
        assert(discreet.proxyPool instanceof ProxyPool);
        assert(discreet.throttler instanceof Throttler);
        assert(discreet.initComplete === true);
        assert(discreet.redis === null);
        assert(discreet.cacheTTL === 86400);
      });
      it('should configure the DiscreetRequest instance with the user configuration options', () => {
        const proxyAuth = {
          username: 'ddluc',
          password: 'test'
        };
        const proxyPoolConfig = {
          testProxies: false,
          targetEndpoint: 'http://google.com',
          failureCases: [407, 1],
          refreshProxies: false,
          refreshRate: 3700000,
          protocol: 'http'
        };
        const throttleConfig = {
          requests: 1,
          milliseconds: 500
        };
        // Mock redis client
        const redis = {
          set: () => true,
          get: () => true
        };
        const cacheTTL = 100;
        const userAgents = ['Chrome', 'Firefox', 'IE'];
        let options = {
          proxies,
          proxyAuth,
          proxyPoolConfig,
          throttleConfig,
          redis,
          cacheTTL,
          userAgents,
        };
        discreet.init(options);
        assert(discreet.proxyPool.proxies === proxies);
        assert(discreet.proxyPool.proxyAuth === proxyAuth);
        assert(discreet.redis === redis);
        assert(discreet.cacheTTTL = cacheTTL);
        assert(discreet.userAgents === userAgents);
        assert(discreet.initComplete === true);
      });
    });

    describe('#request', () => {

      let discreet = new DiscreetRequest();
      discreet.init(defaultOptions);

      it('should make a request to the provided url with a proxy and user agent', (done) => {
        let endpoint = 'http://mytestendpoint.com';
        let throttlerStub = sinon.stub(discreet.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.success;
            let err = null;
            let body = mockResponses.success.body;
            resolve({err, response, body});
          });
        });
        discreet.request(endpoint, {method: 'GET'})
        .then((response) => {
          assert(response);
          assert(throttlerStub.getCall(0).args[0].url === endpoint);
          // Since the proxy pool is responsible for selecting and building the proxy url, the only job for
          // the DiscreetRequest class is to add it to the request options
          assert(throttlerStub.getCall(0).args[0].proxy);
          assert(defaultUserAgents.includes(throttlerStub.getCall(0).args[0].headers['User-Agent']));
          assert(response.cached === false);
          assert(response.body === mockResponses.success.body);
          assert(response.raw === mockResponses.success);
          throttlerStub.restore();
          done();
        })
        .catch((err) => {
          console.log(err);
          assert(false);
          throttlerStub.restore();
          done();
        });
      });

      it('it should throw a ProxyError if you attempt to make a request before .init() is called on the instance', (done) => {
        let throttlerSpy = sinon.spy(discreet.throttler.queue);
        // Mock an incomplete init
        discreet.initComplete = false;
        discreet.request('http://google.com', {method: 'GET'})
        .catch((err) => {
          assert(throttlerSpy.notCalled);
          assert(err instanceof error.ProxyError);
          // Clean up test
          discreet.initComplete = true;
          done();
        })
        .catch((err) => {
          console.log(err);
          assert(false);
          done();
        });
      });

      it('should throw a ProxyError if the authentication to the proxy is unsuccessful', (done) => {
        let endpoint = 'http://mytestendpoint.com';
        let throttlerStub = sinon.stub(discreet.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.proxyError;
            let err = null;
            let body = mockResponses.proxyError.body;
            resolve({err, response, body});
          });
        });
        discreet.request(endpoint).then(() => {
          assert(false);
          throttlerStub.restore();
          done();
        }).catch((err) => {
          assert(err instanceof error.ProxyError);
          throttlerStub.restore();
          done();
        });
      });

      it('should throw a NetworkError if there is an error in the request', (done) => {
        let endpoint = 'http://mytestendpoint.com';
        let throttlerStub = sinon.stub(discreet.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.serverError;
            let err = 'Error: Network Error';
            let body = mockResponses.serverError.body;
            resolve({err, response, body});
          });
        });
        discreet.request(endpoint).then((response) => {
          assert(false);
          throttlerStub.restore();
          done();
        }).catch((err) => {
          assert(err instanceof error.NetworkError);
          throttlerStub.restore();
          done();
        });
      });


      it('should make a request, even if no options are provided to either .init() or .request()', () => {
        // Reset the instance
        discreet.init();
        let endpoint = 'http://mytestendpoint.com';
        let throttlerStub = sinon.stub(discreet.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.success;
            let err = null;
            let body = mockResponses.success.body;
            resolve({err, response, body});
          });
        });
        discreet.request(endpoint).then((response) => {
          assert(response);
          assert(throttlerStub.getCall(0).args[0].proxy === undefined);
          assert(defaultUserAgents.includes(throttlerStub.getCall(0).args[0].headers['User-Agent']));
        });
      });

    });

    describe('#cacheEndpoint', () => {

      let discreet = new DiscreetRequest();
      discreet.init(defaultOptions);

      it('should cache the endpoint response body using the endpoint as a key', () => {
        let redisSetSpy = sinon.spy(discreet.redis, 'set');
        let endpoint = 'http://mytestendpoint.com';
        let data = 'data';
        discreet.cacheEndpoint(endpoint, data);
        assert(redisSetSpy.calledOnce);
        assert(redisSetSpy.calledWith(endpoint, data, 'EX', discreet.cacheTTL));
      });

    });

    describe('#loadEndpointCache', () => {

      let discreet = new DiscreetRequest();
      discreet.init(defaultOptions);

      it('should load the endpoint data from the redis cache', (done) => {
        let endpoint = 'http://mytestendpoint.com';
        let data = 'data';
        let redisGetStub = sinon.stub(discreet.redis, 'get').callsFake((endpoint, cb) => {
          let err = null;
          cb(err, data);
        });
        discreet.loadEndpointCache(endpoint)
        .then((data) => {
          assert(redisGetStub.calledOnce);
          assert(redisGetStub.getCall(0).args[0] === endpoint);
          assert(data === 'data');
          done();
        })
        .catch((err) => {
          console.log(err);
          assert(false);
          done();
        });
      });

      it('should return null if there is no cached data for the provided endpoint', (done)=> {
        let endpoint = 'http://mytestendpoint.com';
        let data = null;
        let redisGetStub = sinon.stub(discreet.redis, 'get').callsFake((endpoint, cb) => {
          let err = null;
          cb(err, null);
        });
        discreet.loadEndpointCache(endpoint)
        .then((data) => {
          assert(redisGetStub.calledOnce);
          assert(redisGetStub.getCall(0).args[0] === endpoint);
          assert(data === null);
          done();
        })
        .catch((err) => {
          console.log(err);
          assert(false);
          done();
        });
      });
    });

    describe('#cachedRequest', () => {

      let discreet = new DiscreetRequest();
      discreet.init(defaultOptions);

      it('should attempt to load the endpoint data from cache, if available', () => {
        assert(true);
      });
      it('should execute a new request if the endpoint data is not available from cache', () => {
        assert(true);
      });
      it('should cache the response body, if a new request is made', () => {
        assert(true);
      });
      it('should reject a RedisError if a redisClient was not provided', () => {
        assert(true);
      });
    });



  });


}
