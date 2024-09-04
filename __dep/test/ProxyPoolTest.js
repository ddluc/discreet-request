const fs = require('fs'),
      assert = require('assert'),
      sinon = require('sinon');

const ProxyPool = require('../lib/ProxyPool'),
      mockResponses = require('./mockResponses');

module.exports = function() {

  describe('ProxyPool', () => {

    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

    let proxyAuth = {
      username: 'username',
      password: 'pass'
    };

    let defaultOptions = {
      testProxies: false,
      targetEndpoint: 'http://mytestendpoint.com',
      failureCases: [407, 403],
      refreshProxies: false,
      refreshRate: 3700000,
      protocol: 'http'
    };

    describe('#constructor', () => {
      it('should create a new instance of the ProxyPool class with provided options', () => {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        assert(proxyPool.proxies === proxies);
        assert(proxyPool.targetEndpoint === defaultOptions.targetEndpoint);
        assert(proxyPool.failureCases === defaultOptions.failureCases);
        assert(proxyPool.refreshRate === defaultOptions.refreshRate);
        assert(proxyPool.protocol === defaultOptions.protocol);
        assert(proxyPool.__PROXY_TEST_COUNT === 0);
      });

      it('should create a new instance of the ProxyPool class with no provided options', () => {
        let proxyPool = new ProxyPool();
        assert(proxyPool.proxies instanceof Array);
        assert(proxyPool.proxies.length === 0);
        assert(proxyPool.proxyAuth === null);
        assert(proxyPool.healthyProxies instanceof Array);
        assert(proxyPool.healthyProxies.length === 0);
        assert(proxyPool.targetEndpoint === 'http://bing.com');
        assert(proxyPool.protocol === 'http');
      });

    });

    describe('#compose', () => {

      it('should test the proxies and compose the pool', () => {
        // turn on proxy testing
        let options = { ...defaultOptions};
        options.testProxies = true;
        let proxyPool = new ProxyPool(proxies, proxyAuth, options);
        let runProxyTestsStub = sinon.stub(proxyPool, 'runProxyTests');
        proxyPool.compose();
        assert(runProxyTestsStub.calledOnce);
        runProxyTestsStub.restore();
      });

      it('should test the proxies on interval and compose the pool', () => {
        // turn on proxy testing
        let options = { ...defaultOptions};
        options.testProxies = true;
        options.refreshProxies = true;
        let proxyPool = new ProxyPool(proxies, proxyAuth, options);
        let runProxyTestsStub = sinon.stub(proxyPool, 'runProxyTestsOnInterval');
        proxyPool.compose();
        assert(runProxyTestsStub.calledOnce);
        runProxyTestsStub.restore();
      });

      it('should not test the proxies on interval and compose the pool', () => {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        let runProxyTestsOnIntervalStub = sinon.stub(proxyPool, 'runProxyTestsOnInterval');
        let runProxyTestsStub = sinon.stub(proxyPool, 'runProxyTests');
        proxyPool.compose();
        assert(runProxyTestsStub.notCalled);
        assert(runProxyTestsOnIntervalStub.notCalled);
        assert(proxyPool.healthyProxies === proxies);
        runProxyTestsOnIntervalStub.restore();
        runProxyTestsStub.restore();
      });

    });

    describe('#buildProxyUrl', () => {
      it('should build a valid url with protocol authentication', () => {
        let proxy = `123.12.34.12:80`;
        let options = { ...defaultOptions };
        options.protocol = 'https';
        let proxyPool = new ProxyPool(proxies, proxyAuth, options);
        let proxyUrl = proxyPool.buildProxyUrl(proxy);
        let expectedUrl = `${options.protocol}://${proxyAuth.username}:${proxyAuth.password}@${proxy}`;
        assert(proxyUrl === expectedUrl);
      });

      it('should build a valid url without authentication when none is provided', () => {
        let proxy = `123.12.34.12:80`;
        let proxyPool = new ProxyPool(proxies);
        let proxyUrl = proxyPool.buildProxyUrl(proxy);
        let expectedUrl = `http://${proxy}`;
        assert(proxyUrl === expectedUrl);
      });

      it('should build a valid url without authentication when authenticaion is invalid', () => {
        let proxy = `123.12.34.12:80`;
        let auth = { username: null, password: 0};
        let proxyPool = new ProxyPool(proxies, auth);
        let proxyUrl = proxyPool.buildProxyUrl(proxy);
        let expectedUrl = `http://${proxy}`;
        assert(proxyUrl === expectedUrl);
      });

    });

    describe('#runProxyTests', () => {

      it ('should test all of the proxies', () => {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        let throttlerQueueStub = sinon.stub(proxyPool.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.success;
            let err = null;
            let body = mockResponses.success.body;
            resolve({err, response, body});
          });
        });
        proxyPool.runProxyTests();
        assert(throttlerQueueStub.callCount === proxies.length);
        proxies.forEach((proxy, index) => {
          let call = throttlerQueueStub.getCall(index);
          let proxyUrl = proxyPool.buildProxyUrl(proxy)
          assert(call.args[0].proxy === proxyUrl);
        });
        throttlerQueueStub.restore();
      });

      it('should add healthy proxies to the pool', (done)=> {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        let throttlerQueueStub = sinon.stub(proxyPool.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.success;
            let err = null;
            let body = mockResponses.success.body;
            resolve({err, response, body});
          });
        });
        proxyPool.runProxyTests();
        setTimeout(() => {
          assert(proxyPool.healthyProxies.length === proxies.length);
          throttlerQueueStub.restore();
          done();
        }, 100);
      });

      it('should not add dead proxies to the pool', (done)=> {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        let throttlerQueueStub = sinon.stub(proxyPool.throttler, 'queue').callsFake((options) => {
          return new Promise((resolve, reject) => {
            let response = mockResponses.forbidden;
            let err = null;
            let body = mockResponses.forbidden.body;
            resolve({err, response, body});
          });
        });
        proxyPool.runProxyTests();
        setTimeout(() => {
          assert(proxyPool.healthyProxies.length === 0);
          throttlerQueueStub.restore();
          done();
        }, 100);
      });

    });

    describe('#getProxy', () => {

      it('should return the next available proxy in the pool', () => {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        proxyPool.compose();
        proxies.forEach((proxy, index) => {
          assert(index === proxyPool.proxyIndex);
          let proxy1 = proxyPool.getProxy();
          let proxy2 = proxyPool.buildProxyUrl(proxy);
          assert(proxy1 === proxy2);
        });
      });

      it('should return null if there are no proxies in the pool', () => {
        let proxyPool = new ProxyPool(proxies, proxyAuth, defaultOptions);
        proxyPool.compose();
        proxyPool.healthyProxies = [];
        let proxy = proxyPool.getProxy();
        assert(proxy === null);
      });

    });

  });

}
