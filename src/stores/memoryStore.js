/**
 * A `Store` to keep track of API hit counts for each 'key' in memory.
 *
 * @public
 */
class MemoryStore {
  /**
   * @param {object} options - Configuration options for the memory store.
   * @param {number} options.windowMs - Window size after which all the hit counts are reset.
   */
  constructor(options) {
      /**
       * Map to store the number of hits for each client.
       * @private
       */
      this.storage = new Map();
      
      /**
       * Window size after which all the hit counts are reset.
       * @private
       */
      this.windowMs = options.windowMs;

      /**
       * The time at which count will be reset.
       * @private
       */
      this.resetTime = this.#calculateResetTime();

      /**
       * Timer to keep track of the window.
       * @private
       */
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
   * @returns {object} - An object containing the new count and reset time.
   */
  async increment(key, value = 1) {
      const currentCount = this.storage.get(key) || 0;
      const newCount = currentCount + value;
      this.storage.set(key, newCount);
      return {
          newCount,
          resetTime: this.resetTime,
      };
  }

  async get(key) {
    return this.storage.get(key) || 0;
  }

  /**
   * Decrement the hit count for the specified key.
   * @param {string} key - The key to decrement the hit count for.
   */
  async decrement(key) {
      const currentCount = this.storage.get(key) || 0;
      if (currentCount) {
          this.storage.set(key, currentCount - 1);
      }
  }

  /**
   * Reset the hit count for the specified key.
   * @param {string} key - The key to reset the hit count for.
   */
  async resetKey(key) {
      this.storage.delete(key);
  }

  /**
   * Reset the hit counts for all keys.
   */
  async resetAll() {
      this.storage.clear();
      this.resetTime = this.#calculateResetTime();
  }

  /**
   * Close the memory store and stop the reset timer.
   */
  close() {
      clearInterval(this.timer);
  }

  /**
   * Calculate the time when hit counts will be reset.
   * @returns {Date} - The calculated reset time.
   * @private
   */
  #calculateResetTime() {
      const resetTime = new Date();
      const newTime = resetTime.getTime() + this.windowMs;
      resetTime.setTime(newTime);
      return resetTime;
  }
}

module.exports = MemoryStore;
