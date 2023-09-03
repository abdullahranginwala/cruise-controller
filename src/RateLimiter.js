const { default: MemoryStore } = require("./stores/memoryStore");

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 60 * 1000; // default to 1 minute
        this.max = options.max || 5; // default to 5 requests per windowMs
        this.getKey = options.getKey || ((req) => req.ip); // default to IP if no getKey function provided
        this.store = options.store || new MemoryStore({ windowMs: this.windowMs }); // using MemoryStore
        this.whitelist = options.whitelist || [];
        this.blacklist = options.blacklist || [];
        this.onExceeded = options.onExceeded || ((req, res) => res.sendStatus(429)); // default to 429 status
        this.blockedIPs = new Set(); // To store blocked IP addresses

        // Throttling settings (optional)
        this.enableThrottling = options.enableThrottling || false;
        this.throttleMax = options.throttleMax || 10; // default to 10 requests per short window
        this.throttleWindowMs = options.throttleWindowMs || 1000; // default to 1 second
        this.throttleStore = new Map(); // To store throttle counts
    }

    async delayedRateLimiting(req) {
        const identifier = this.getKey(req);

        // Skip rate limiting if max is set to 0
        if (this.max === 0) {
            return false;
        }

        // Check if IP is blocked
        if (this.blockedIPs.has(identifier)) {
            return true;
        }

        await this.store.increment(identifier);
        const currentCount = await this.store.get(identifier);

        if (currentCount > this.max) {
            // Introduce a delay before proceeding if enabled
            if (this.enableThrottling) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Example delay: 1 second
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

            if (this.max === 0) {
                return next(); // Skip rate limiting if max is set to 0
            }

            if (this.windowMs <= 50) {
                return this.onExceeded(req, res); // Apply rate limiting instantly if windowMs is very small
            }

            // Throttle requests first (if enabled)
            if (this.enableThrottling && await this.throttling(req)) {
                return this.onExceeded(req, res);
            }

            if (await this.delayedRateLimiting(req)) {
                // Rate limit exceeded
                this.setRateLimitHeaders(res, identifier);
                return this.onExceeded(req, res);
            }

            // Request passed rate limiting, set headers
            this.setRateLimitHeaders(res, identifier);
            next();
        };
    }

    setRateLimitHeaders(res, identifier) {
        const currentCount = this.store.getSync(identifier);
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