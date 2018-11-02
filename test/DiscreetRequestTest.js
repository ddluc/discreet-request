const redis = require("redis"),
      fs = require('fs');
const DiscreetRequest = require('../src/query');

module.exports = function() {

  describe('DiscreetRequest', () => {

    // Setup / Configure Redis Client
    let redisConfig = {
     host: process.env.REDIS_HOST,
     port: process.env.REDIS_PORT
    };
    redisClient = redis.createClient(redisConfig);
    redisClient.flushall();


    // Load Proxies
    let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
    let proxies = proxiesString.split("\n")
         .filter(proxy => proxy.length > 0);

    describe('#constructor', () => {
      it('should instantiate a new Discreet Request class with default values', () => {

      });
    });

    describe('#init', () => {
      it('should configure the DiscreetRequest instance with the user configuration options', () => {

      });
      it('should set the default values for all configuration options that are not defined', () => {

      });
      it ('should set a flag indicating that the initialization is completed', () => {

      });
    });

    describe('#cacheEndpoint', () => {
      it('should cache the endpoint response body using the endpoint as a key', () => {

      });
    });

    describe('#loadEndpointFromCache', () => {
      it('should load the endpoint data from the redis cache', () => {

      });
      it('should return null if there is no cached data for the provided endpoint', ()=> {

      });
    });

    describe('#cachedRequest', () => {
      it('should attempt to load the endpoint data from cache, if available', () => {

      });
      it('should execute a new request if the endpoint data is not available from cache', () => {

      });
      it('should cache the response body, if a new request is made', () => {

      });
      it('should reject a RedisError if a redisClient was not provided', () => {

      }); 
    });

    describe('#request', () => {
      it('should only make a request if the init is complete', () => {

      });
      it('should make a request to the provided url using the instance confifuration options', () => {

      });
      it('should use a random user agent to make the request, if they are set', () => {

      });
      it('should use a proxy to make the request, if they are available', () => {

      });
      it('should throw a ProxyError if the authentication to the proxy is unsuccessfult', () => {

      });
    });

  });


}
