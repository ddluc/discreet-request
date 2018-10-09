# Discreet Requests

This module a wrapper around the popular node request library for creating discreet, un-intrusive http requests.  

## Features:

* Creates requests using rotating proxies and user agents
* Throttles requests using a timeout
* _TODO: Maintains a proxy pool that drops dead or blocked proxiesString_
* _TODO: Implements a request cache to avoid making unnecessary requests._

Before scraping any data from a website, please refer and abide by the Terms of Service.

## Getting Started

#### Install

```
npm install discreet-requests
```

#### Set Up Your Environment:

```
PROXY_USERNAME=[USERNAME]
PROXY_PASSWORD=[PASSWORD]
```

#### Setup Your Proxies

This module _does not_ provide you with proxy servers. You must acquire your own proxy servers, and copy their addresses in a `.proxy` file in the root of your application. There are free proxy lists, but they generally preform poorly and are unreliable. For any real project you will want to purchase your own premium proxies. This module does not recommend any premium proxy provider.

Example `.proxy` file:

```
105.260.10.194:80
76.25.235.161:80
193.242.216.47:80
147.154.70.117:80
166.242.216.47:80
```
