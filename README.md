# Cruise-Controller - An Express Middleware for Rate Limiting

## Introduction
Cruise-controller is a flexible rate limiting middleware for Express. It allows you to limit requests based on custom identifiers such as IP addresses or authenticated users. It also supports throttling by performing exponential backoff and can use either in-memory or Redis storage. It also allows for whitelisting and blacklisting of identifiers and several more configuration options.

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
* `blacklist`: An array of identifiers to always block. Defaults to an empty array.
* `onExceeded`: A function that is called when the rate limit is exceeded. It receives the request and response objects and must send a response. Defaults to a function that sends a 429 status.

## Exponential Backoff
The rate limiting mechanism incorporates an `Exponential Backoff` feature, designed to gracefully handle rate-limit exceeded responses. When a client surpasses its allowed request limit, instead of receiving an immediate error response, this feature introduces a time delay for subsequent requests from that client. The delay duration starts conservatively and gradually increases with each exceeded request, allowing the client to recover and reduce the request rate. This ensures a smoother and more user-friendly experience, preventing rapid successive requests and minimizing service disruptions due to rate limiting.

* `enableExponentialBackoff`: Option to enable the feature. Defaults to false.
* `baseDelayMs`: The base delay time, in milliseconds. Defaults to 1 second.
* `maxDelayMs`: The maximum limit to delay a request, in milliseconds. Defaults to 1 minute;
* `delayMultiplier`: The multiplier to exponentially increase the current delay for each client. Defaults to 2.

## Custom Stores

You can implement your own custom store. Refer to `redisStore.js` and `memoryStore.js` for more info.

## Contributing

Please feel free to open an issue or pull request if you would like to contribute to this project.