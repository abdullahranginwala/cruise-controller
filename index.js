const { default: MemoryStore } = require("./stores/memoryStore");

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // default to 1 minute
    this.max = options.max || 5; // default to 5 requests per windowMs
    this.getKey = options.getKey || ((req) => req.ip); // default to IP if no getKey function provided
    this.store = options.store || new MemoryStore(); // default to memory store
    this.whitelist = options.whitelist || [];
    this.blacklist = options.blacklist || [];
    this.onExceeded = options.onExceeded || ((req, res) => res.sendStatus(429)); // default to 429 status
    this.strategy = options.strategy || this.fixedWindow; // default to fixed window strategy
  }

  fixedWindow(req) {
    const identifier = this.getKey(req);
    return this.store.get(identifier)
      .then(currentCount => currentCount >= this.max);
  }

  // Token Bucket strategy
  tokenBucket(req) {
    const identifier = this.getKey(req);
    return this.store.get(identifier)
      .then(currentCount => {
        if (currentCount < this.max) {
          this.store.increment(identifier, this.windowMs);
          return false; // continue processing the request
        } else {
          return true; // limit exceeded
        }
      });
  }

  middleware() {
    return (req, res, next) => {
      const identifier = this.getKey(req);

      // Handle whitelisting
      if (this.whitelist.includes(identifier)) {
        return next();
      }

      // Handle blacklisting
      if (this.blacklist.includes(identifier)) {
        return this.onExceeded(req, res);
      }

      if (this.strategy(req)) {
        return this.onExceeded(req, res);
      } else {
        this.store.increment(identifier);
        next();
      }
    };
  }
}

module.exports = RateLimiter;
