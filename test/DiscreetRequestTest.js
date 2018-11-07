const fs = require('fs'),
      assert = require('assert'),
      sinon = require('sinon');

const DiscreetRequest = require('../lib/DiscreetRequest');
      ProxyPool = require('../lib/ProxyPool'),
      Throttler = require('../lib/Throttler'),
      error = require('../util/error'),
      defaultUserAgents = require('../util/userAgents'),

module.exports = function() {

  describe('DiscreetRequest', () => {


    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

    // Define mock HTTP responses:
    let mockSuccessResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      body: 'mock_success_body_content',
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
      // Reset the discreet instance for the remaining tests
      let options = {
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
          get: () => true,
          set: () => true
        },
        userAgents: defaultUserAgents
      };
      discreet.init(options);

      it('should make a request to the provided url with a proxy and user agent', (done) => {
        let endpoint = 'http://yahoo.com'
        let throttlerStub = sinon.stub(discreet.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockSuccessResponse;
            let err = null;
            let body = mockSuccessResponse.body;
            resolve({err, response, body});
          });
        });
        discreet.request(endpoint, {method: 'GET'})
        .then((response) => {
          assert(response);
          assert(throttlerStub.getCall(0).args[0].url === endpoint);
          assert(throttlerStub.getCall(0).args[0].proxy);
          assert(defaultUserAgents.includes(throttlerStub.getCall(0).args[0].headers['User-Agent']));
          assert(response.cached === false);
          assert(response.body === mockSuccessResponse.body);
          assert(response.raw === mockSuccessResponse);
          done();
          throttlerStub.restore();
        })
        .catch((err) => {
          console.log('error', err);
        });
      });

      it('it should throw a ProxyError if you attempt to make a request before .init() is called on the instance', (done) => {
        let throttlerSpy = sinon.spy(discreet.throttler.queue);
        // mock an incomplete init
        discreet.initComplete = false;
        discreet.request('http://google.com', {method: 'GET'})
        .catch((err) => {
          assert(throttlerSpy.notCalled);
          assert(err instanceof error.ProxyError);
          // clean up test
          discreet.initComplete = true;
          done();
        });
      });

      it('should use a random user agent to make the request, if they are set', () => {
        assert(true);
      });
      it('should use a proxy to make the request, if they are available', () => {
        assert(true);
      });
      it('should throw a ProxyError if the authentication to the proxy is unsuccessful', () => {
        assert(true);
      });
      it('should make a request, even if no options are provided', () => {

      });
    });

    describe('#cacheEndpoint', () => {
      it('should cache the endpoint response body using the endpoint as a key', () => {
        assert(true);
      });
    });

    describe('#loadEndpointFromCache', () => {
      it('should load the endpoint data from the redis cache', () => {
        assert(true);
      });
      it('should return null if there is no cached data for the provided endpoint', ()=> {
        assert(true);
      });
    });

    describe('#cachedRequest', () => {
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
