const MemoryStore = require('./stores/memoryStore');

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000; // default to 1 minute
        this.max = options.max || 5; // default to 5 requests per windowMs
        this.getKey = options.getKey || ((req) => req.ip); // default to IP if no getKey function provided
        this.store = options.store || new MemoryStore({ windowMs: this.windowMs }); // using MemoryStore
        this.whitelist = options.whitelist || [];
        this.blacklist = options.blacklist || [];
        this.onExceeded = options.onExceeded || ((req, res) => res.sendStatus(429)); // default to 429 status

        // Exponential Backoff settings (optional)
        this.enableExponentialBackoff = options.enableExponentialBackoff || false;
        this.baseDelayMs = options.baseDelayMs || 1000; // Default base delay is 1 second
        this.maxDelayMs = options.maxDelayMs || 60000; // Default max delay is 60 seconds
        this.delayMultiplier = options.delayMultiplier || 2; // Default multiplier is 2
    }

    async rateLimiting(req) {
        const identifier = this.getKey(req);

        await this.store.increment(identifier);
        const currentCount = await this.store.get(identifier);

        if (currentCount > this.max) {
            if (this.enableExponentialBackoff) {
                //Calculate delay based on API calls greater than max
                const multiplier = (currentCount-this.max)**(this.delayMultiplier-1);
                const clientDelay = multiplier*this.baseDelayMs ;

                // Introduce a delay based on the client's current delay
                if (clientDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, clientDelay));
                    return false;
                }
            }
            return true;
        }

        return false;
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

            // Skip rate limiting if max is set to 0
            if (this.max === 0) {
                return next(); 
            }

            // Apply rate limiting instantly if windowMs is very small
            if (this.windowMs <= 50) {
                return this.onExceeded(req, res);
            }

            this.setRateLimitHeaders(res, identifier);

            if (await this.rateLimiting(req)) {
                // Rate limit exceeded
                return this.onExceeded(req, res);
            }

            // Request passed rate limiting
            next();
        };
    }

    setRateLimitHeaders(res, identifier) {
        const currentCount = this.store.get(identifier);
        const remaining = Math.max(0, this.max - currentCount);

        res.setHeader('X-RateLimit-Limit', this.max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil((this.store.resetTime - Date.now()) / 1000));
    }

    close() {
        this.store.close();
    }
}

module.exports = RateLimiter;