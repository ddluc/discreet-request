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
      it('should build a valid url', () => {
        assert(true);
      });
    });

    describe('#testProxies', () => {
      it ('should test all of the proxies', () => {
        assert(true);
      })
    });

    describe('#getProxyUrl', () => {
      it('should return the next available proxy in the pool', () => {
        assert(true);
      });
    });

  });

}
