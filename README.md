# Discreet Requests

This module a wrapper around the popular node [request](https://github.com/request/request) library for creating discreet, un-intrusive http requests.  

## Features:

* Creates requests using rotating proxies and user agents
* Throttles requests using a rate limiter
* Maintains a proxy pool that drops dead or blocked proxies.
* Implements a request cache to avoid making unnecessary requests to the requested resource

Before scraping any data from a website, please refer and abide by the Terms of Service.

## Usage

### `Discreet`

The discreet-request module returns a singleton instance of the `Discreet` class, which will be used throughout the lifespan of the application.

```
// discreet now references a Discreet instance
const discreet = require('discreet-request');
```

#### `discreet.init(options<Object>)`

The available **`options<Object>`**:

* **`proxies<Array>`**: An array of proxy addresses to use for discreet requests, such as `105.260.10.194:80`. Default `[]`.
* **`proxyAuth<Object>`**: An object containing the proxy username and password such as `{ username: '...', password: '...'}`. If no auth is provided then the request will be made to the proxy without any credentials.
* **`proxyPoolConfig<Object>`**: The underlying proxy pool configuration
    * **`targetEndpoint<String>`**: The endpoint to test the proxies against. Default: `http://bing.com`.
    * **`failureCases<Array>`**: The status codes that flag a "dead/inoperable proxy". Default `[407, 403, 408]`.
    * **`refreshProxies<Boolean>`**:  flag that indicates whether or not the proxies should be monitored and refreshed. Default: `false`
    * **`refreshRate<Number>`**: How often the proxies are refreshed in milliseconds. Only applicable if `refreshProxies` is enabled. Default: `3600000`
    * **`protocol<String>`**: Determines which protocol to use with the proxies. Either `http` or `https`. For customizing request tunneling config, see the node [request](https://github.com/request/request) documentation and set the proper config your request using the `requestOptions`. Default: `http`.
* **`throttleConfig<Object>`**: An object containing a `request` property, which designatees the number of requests to make per batch, and a `milliseconds` property, which defines how frequently a batch is executed. Default: `{ requests: 1, milliseconds: 500}`
* **`userAgents<Array>`**: An array of User Agents, if not using the default User Agents. Default: An array of provided user agents from the library.
* **`redis<RedisClient>`**: A redis client created by calling `redis.createClient();`. *Note: The library does not depend on or manage a redis instance, you will need to configure your own redis server and provide the library an instance to a redis client*. Default `null`.
* **`cacheTTL<Number>`**: Set how long a resource should be cached before it's cleared. Only applicable if a redis instance is provided. Default `86400` (1 day).

**Returns:** `true`


#### `discreet.request(url<String>, requestOptions<Object>)`

The `request` method will make a new request to the provided `url`, using the provided `requestOptions`. It will *not* cache the body of the response.

**Params**:
* **`url<String>`**: The url to request
* **`requestOptions<Object>`**: The options to forward to the underlying node [request](https://github.com/request/request) library

**Returns**: a standardized response object.

Example response:
```
let formattedResponse = {
  body: <String>
  statusCode: <Number>
  cached: <Boolean>,
  raw: <HttpIncomingMessage>
};
```

#### `discreet.cachedRequest(url<String>, requestOptions<Object>)`

The `cachedRequest` method will first attempt to load the response body for the provided endpoint from the cache. If it's available, it will return the response body without making a request to the resource. If the data for the provided endpoint is not available, it will make a new request using the `request` method. The response will then be stored in the cache for the designated cache TTL (Default 1 Day).

**Params**:
* **`url<String>`**: The url to request
* **`requestOptions<Object>`**: The options to forward to the underlying node [request](https://github.com/request/request) library

**Returns**: a standardized response object.
Example of a cached response:
```
let formattedResponse = {
  body: <String>
  statusCode: null
  cached: true,
  raw: null
};
```
A couple of notes:
* You can note whether an actual request was made using the `cached` property on the return object
* The statusCode might be `null` if no request is made.
* The full response will be `null`.

### `ProxyPool`

The `ProxyPool` class the the underlying data structure that the `Discreet` class uses to test and manage the provided list of proxies. It's not accessible directly, but if needed, the instance lives under `discreet.proxyPool`.

### Example Setup:

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
