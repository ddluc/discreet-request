/**
 * discreetRequest.js
 * @description generates throttled http requests using rotating proxies and fake user agents
 */

const fs = require('fs'),
      request = require('request'),
      throttledRequest = require('throttled-request')(request),
      error = require('./util/error'),
      logger = require('./util/logger');


//configure the request throttler
throttledRequest.configure({
  requests: 1,
  milliseconds: 1000
});

/**
 * getProxy
 * @description scrapes the first 20 proxies off of https://free-proxy-list.net/
 * then selects a random proxy address
 * @returns {Promise}<string> proxy - the proxy address to use for the descreet request
 */
const getProxy = () => {
  let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
  let proxies = proxiesString.split("\n")
        .filter(proxy => proxy.length > 0);
  let randomIndex = Math.floor(Math.random() * Math.floor(proxies.length - 1));
  return proxies[randomIndex];
}

/**
 * getUserAgents
 * @description generates a random user agent
 */
const getUserAgent = () => {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 5.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
    'Mozilla/4.0 (compatible; MSIE 9.0; Windows NT 6.1)',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (Windows NT 6.2; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.0; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.3; WOW64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64; Trident/7.0; rv:11.0) like Gecko',
    'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; WOW64; Trident/6.0)',
    'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)',
    'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0; .NET CLR 2.0.50727; .NET CLR 3.0.4506.2152; .NET CLR 3.5.30729)'
  ];
  let randomIndex = Math.floor(Math.random() * Math.floor(userAgents.length - 1));
  return userAgents[randomIndex];
}

/**
 *
 * @description the exported function that generates the request
 * @param {object} options - request object to be forwarded to the node request library
 * @param {object} protocol - either HTTP or HTTPS
 */
module.exports = (options, protocol='http') => {
  return new Promise((resolve, reject) => {
    let userAgent = getUserAgent();
    let proxy = getProxy();
    options.proxy = `${protocol}://${proxy}:${process.env.PROXY_USERNAME}:${process.env.PROXY_PASSWORD}`;
    options.headers = {'User-Agent': userAgent};
    logger.dev(`Creating discreet request with proxy address ${options.proxy} and User Agent ${options.headers['User-Agent']}`);
    throttledRequest(options, (err, response, body)=> {
      if (err) {
        logger.error(err);
        throw new error.NetworkError(`Could not complete request to ${options.uri}`);
      }
      resolve(body);
    });
  });
}
