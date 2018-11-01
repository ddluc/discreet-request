const redis = require("redis"),
      fs = require('fs');
const ProxyPool = require('../src/query');

module.exports = function() {

  describe('ProxyPool', () => {

    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

    describe('#constructor', () => {

    });

    describe('#buildProxyUrl', () => {

    });

    describe('#testProxies', () => {

    });

    describe('#getProxyUrl', () => {

    });

  });

}
