# Discreet Requests

This module a wrapper around the popular node [request](https://github.com/request/request) library for creating discreet, un-intrusive http requests.  

## Features:

* Creates requests using rotating proxies and user agents
* Throttles requests using a timeout
* Maintains a proxy pool that drops dead or blocked proxiesString
* Implements a request cache to avoid making unnecessary requests to the requested resource

Before scraping any data from a website, please refer and abide by the Terms of Service.

# Usage

## Discreet

The discreet-request module returns a singleton instance of the `Discreet` class, which will be used throughout the lifespan of the application.

```
// discreet now references a Discreet instance
const discreet = require('discreet-request');
```

### `discreet.init(options<Object>)`

The available `options`:

`proxies<Array>`: An array of proxy addresses to use for discreet requests, such as `105.260.10.194:80`

`proxyAuth`: An object containing the proxy username and password such as `{ username: '...', password: '...'}`

`proxyPoolConfig`: See the ProxyPool documentation below

`protocol`: Determines which protocol to use with the proxies. Either `http` or `https`. For customizing request tunneling config, see the node [request](https://github.com/request/request) documentation and set the proper config your request using the `requestOptions`.

`throttleConfig`: An object containing the throttle config:
```
{
  // the number of requests to make per batch
  requests: 1,
  // the rate limit. i.e. how frequently a batch is executed
  milliseconds: 200
}`
```

`userAgents`: An array of User Agents, if not using the default User Agents

`redis`: A redis client created by calling `redis.createClient();`

`cacheTTL`: Set how long a resource should be cached before it's cleared. Only applicable if a redis instance is provided.

### `discreet.request(url<String>, requestOptions<Object>)`

`url`: The url to request

`requestOptions`: The options to forward to the underlying node [request](https://github.com/request/request) library


## ProxyPool

The `ProxyPool` class the the underlying data structure that the `Discreet` class uses to test and manage the provided list of proxies. It can be accessed directly, if needed, under `discreet.proxyPool`.

### `ProxyPool.constructor(proxies<Array>, options<Object>)`

`proxies`: The list of proxies to use. This is provided by default when setting the proxies using `discreet.init(options)`.

The available `options`:

`targetEndpoint`: The endpoint to test the proxies against. Default: `http://bing.com`.

`failureCases`: The status codes that flag a "dead/inoperable proxy". Default `[407, 403, 408]`.

`refreshProxies`:  flag that indicates whether or not the proxies should be monitored and refreshed. Default: `false`

`refreshRate`: How often the proxies are refreshed (if enabled). Default: `3600000`


## Example Setup:

```
discreet = require('discreet-request');

// Setup / Configure Redis Client
let redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
};
redisClient = redis.createClient(redisConfig);
redisClient.flushall();

// Load Proxies from a file
let proxiesString = fs.readFileSync(`${process.cwd()}/.proxy`, 'utf8');
let proxies = proxiesString.split("\n")
      .filter(proxy => proxy.length > 0);

// Configure Discreet Request Module
let options = {
  proxies,
  throttleConfig: {
    requests: 1,
    milliseconds: 600
  },
  proxyAuth: {
    username: process.env.PROXY_USERNAME,
    password: process.env.PROXY_PASSWORD
  },
  redis: redisClient
};

// Call the initialization
discreet.init(options);

// Make a discreet request!
discreet.request(options).then((response) => {
  ...
})
.catch((error) => {
  throw error
});
```
