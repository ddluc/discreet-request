# Discreet Requests

This module a wrapper around the popular node request library for creating discreet, un-intrusive http requests.  

## Features:

* Creates requests using rotating proxies and user agents
* Throttles requests using a timeout
* _TODO: Maintains a proxy pool that drops dead or blocked proxiesString_
* _TODO: Implements a request cache to avoid making unnecessary requests._

Before scraping any data from a website, please refer and abide by the Terms of Service.

## Usage

```
discreet.init(proxies<Array>, proxyAuth<Object>, throttleConfig<Object>);
```

| Option           | Value          |
| :-------------   | :------------- |
| `proxies`        | an array of proxies to use for discreet requests, such as `105.260.10.194:80`|
| `proxyAuth`      | an object containing the proxy username and password: `{username: '...', password: '...'}`|
| `throttleConfig` | an object containing the throttle config: `{requests: 1, milliseconds: 200}`  |
| `userAgents`     | an array of User Agents, if not using the default User Agents |


```
discreet.request(requestOptions<Object>, protocol<String>);
```

| Option           | Value          |
| :-------------   | :------------- |
| `proxies`        | the request options. See request documentation for more details |
| `protocol`       | either 'http' or 'https' |


## Example:

```
discreet = require('discreet-request');

let proxies = [
  105.260.10.194:80,
  76.25.235.161:80,
  193.242.216.47:80,
  147.154.70.117:80,
  166.242.216.47:80
];
let throttleConfig = {
    requests: 1,
    milliseconds: 600
};
let proxyAuth = {
  username: process.env.PROXY_USERNAME,
  password: process.env.PROXY_PASSWORD
}
discreet.init(proxies, proxyAuth, throttleConfig);

let options = {
  uri = 'https://google.com',
  method: 'GET'
};

discreet.request(options).then((response) => {
  ...
})
.catch((error) => {
  throw error
});
```
