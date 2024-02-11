const Redis = require('ioredis');

/**
 * A `Store` to keep track of API hit counts for each 'key' in Redis.
 *
 * @public
 */
class RedisStore {
    /**
     * @param {object} options - Configuration options for the Redis store.
     * @param {number} options.windowMs - Window size after which all the hit counts are reset.
     */
    constructor(options) {
        // Initialize a Redis client
        this.client = new Redis(options.redisOptions);

        /**
         * Window size after which all the hit counts are reset.
         * @private
         */
        this.windowMs = options.windowMs;

        // Initialize the reset time
        this.resetTime = this.calculateResetTime();

        // Initialize a timer to keep track of the window
        this.timer = setInterval(async () => {
            await this.resetAll();
        }, this.windowMs);

        // Clean up the timer
        if (this.timer.unref) this.timer.unref();
    }

    /**
     * Increment the hit count for the specified key.
     * @param {string} key - The key to increment the hit count for.
     * @param {number} [value=1] - The value to increment by (default is 1).
     * @returns {Promise<object>} - An object containing the new count and reset time.
     */
    async increment(key, value = 1) {
        const currentCount = await this.client.incrby(key, value);
        
        // Set the expiration for the key (for other methods)
        // await this.client.pexpire(key, this.windowMs);

        return {
            newCount: currentCount,
            resetTime: this.resetTime,
        };
    }

    /**
     * Decrement the hit count for the specified key.
     * @param {string} key - The key to decrement the hit count for.
     */
    async decrement(key) {
        await this.client.decr(key);
    }

    /**
     * Reset the hit count for the specified key.
     * @param {string} key - The key to reset the hit count for.
     */
    async resetKey(key) {
        await this.client.del(key);
    }

    /**
     * Reset the hit counts for all keys.
     */
    async resetAll() {
        // Delete all keys
        const keys = await this.client.keys('*');
        if (keys.length > 0) {
            await this.client.del(keys);
        }

        // Update the reset time
        this.resetTime = this.calculateResetTime();
    }

    /**
     * Close the Redis store and stop the reset timer.
     */
    close() {
        clearInterval(this.timer);
        this.client.quit();
    }

    /**
     * Calculate the time when hit counts will be reset.
     * @returns {Date} - The calculated reset time.
     * @private
     */
    calculateResetTime() {
        const resetTime = new Date();
        const newTime = resetTime.getTime() + this.windowMs;
        resetTime.setTime(newTime);
        return resetTime;
    }
}

module.exports = RedisStore;
