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
        this.strategy = (options.strategy || this.fixedWindow).bind(this); // default to fixed window strategy
    }

    async fixedWindow(req) {
        const identifier = this.getKey(req);
      
        // Skip rate limiting if max is set to 0
        if (this.max === 0) {
          return false;
        }
      
        await this.store.increment(identifier);
        const currentCount = await this.store.get(identifier);
        if (currentCount > this.max) {
          return true;
        }
        
        return false;
    }

    async slidingWindowCounter(req) {
        const now = Date.now();
        const identifier = this.getKey(req);
        const timestamps = await this.store.get(identifier);
    
        const windowStart = now - this.windowMs;
        const recentTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
        if (recentTimestamps.length >= this.max) {
          return true; // limit exceeded
        } else {
          recentTimestamps.push(now);
          await this.store.increment(identifier, recentTimestamps);
          return false; // continue processing the request
        }
    }
    
    // Token Bucket strategy
    async tokenBucket(req) {
        const identifier = this.getKey(req);
        const currentCount = await this.store.get(identifier);
    
        if (currentCount < this.max) {
        await this.store.increment(identifier, this.windowMs);
        return false; // continue processing the request
        } else {
        return true; // limit exceeded
        }
    }  

    middleware() {
        return async (req, res, next) => {
          const identifier = this.getKey(req);
    
          // Handle whitelisting
          if (this.whitelist.includes(identifier)) {
            return next();
          }
    
          // Handle blacklisting
          if (this.blacklist.includes(identifier)) {
            return this.onExceeded(req, res);
          }
    
          if (this.max === 0) {
            return next(); // Skip rate limiting if max is set to 0
          }
    
          if (this.windowMs <= 50) {
            return this.onExceeded(req, res); // Apply rate limiting instantly if windowMs is very small
          }
    
          if (await this.strategy(req)) {
            return this.onExceeded(req, res);
          } else {
            next();
          }
        };
    }
  
}

module.exports = RateLimiter;