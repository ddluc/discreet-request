const redis = require("redis"),
      fs = require('fs'),
      assert = require('assert');

const ProxyPool = require('../lib/ProxyPool');

module.exports = function() {

  describe('ProxyPool', () => {

    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

    describe('#constructor', () => {
      it('should create a new instance of the ProxyPool class', () => {
        assert(true);
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
