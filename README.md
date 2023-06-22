# Cruise-Controller - An Express Middleware for Rate Limiting

## Introduction
Cruise-controller is a flexible rate limiting middleware for Express. It allows you to limit requests based on custom identifiers such as IP addresses or authenticated users. It supports several rate limiting strategies and can use either in-memory or Redis storage. It also allows for whitelisting and blacklisting of identifiers, customizable error responses, and has features for robust handling of store failures.

## Installation
First, install the package using npm:

`npm install cruise-controller`

Then, require it in your project:

`const RateLimiter = require('cruise-controller');`

## Usage

Instantiate the rate limiter with desired options:

```
const rateLimiter = new RateLimiter({
  max: 100, // max requests
  windowMs: 15 * 60 * 1000, // window in milliseconds
  getKey: (req) => req.ip, // function to identify the source of a request
  store: new RedisStore(), // specify the store
  whitelist: ['127.0.0.1'], // array of whitelisted identifiers
  blacklist: [], // array of blacklisted identifiers
  onExceeded: (req, res) => res.sendStatus(429), // function to execute when rate limit is exceeded
  strategy: rateLimiter.fixedWindow // rate limiting strategy
}); 
```

Use the rate limiter in your Express app:

`app.use(rateLimiter.middleware());`

## Options

The rate limiter takes the following options:

* `max`: The maximum number of allowed requests in the specified window. Defaults to 5.
* `windowMs`: The window of time in which requests are considered for rate limiting, in milliseconds. Defaults to 1 minute.
* `getKey`: A function that takes a request and returns an identifier. Defaults to the IP address from the request.
* `store`: The store to use for storing rate limiting data. Defaults to an in-memory store. Can be a MemoryStore or RedisStore instance.
* `whitelist`: An array of identifiers to always allow. Defaults to an empty array.
blacklist: An array of identifiers to always block. Defaults to an empty array.
onExceeded: A function that is called when the rate limit is exceeded. It receives the request and response objects and must send a response. Defaults to a function that sends a 429 status.
* `strategy`: The rate limiting strategy to use. Defaults to fixed window. Can be any of the four provided strategies: fixedWindow, slidingWindowCounter, slidingWindowLog, tokenBucket.

## Strategies

* `fixedWindow`: Allows a fixed number of requests in the specified window.
* `slidingWindowCounter`: A variation of the fixed window strategy that starts a new window when the first request is received.
* `slidingWindowLog`: Keeps a log of request timestamps and allows a maximum number of requests in the window.
* `tokenBucket`: Allows a certain number of requests at any time but refills the "bucket" of allowed requests at a fixed rate.

## Custom Stores

You can use a custom store by implementing a class with `increment` and `get` methods that both accept an identifier and return a Promise.

## Contributing

Please feel free to open an issue or pull request if you would like to contribute to this project.