const redis = require('redis');

class RedisStore {
  constructor() {
    this.client = redis.createClient();

    // Graceful error handling
    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  increment(key, windowMs) {
    const now = Date.now();

    return new Promise((resolve, reject) => {
      // use lpush to add timestamp to the list at key
      this.client.lpush(key, now, (err) => {
        if (err) return reject(err);

        // set expiry for the key
        this.client.expire(key, Math.ceil(windowMs / 1000), (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  get(key) {
    return new Promise((resolve, reject) => {
      // use lrange to get the list at key
      this.client.lrange(key, 0, -1, (err, res) => {
        if (err) return reject(err);

        // convert string timestamps to numbers and reverse to maintain chronological order
        const timestamps = res.map(Number).reverse() || [];
        resolve(timestamps);
      });
    });
  }
}

module.exports = RedisStore;
