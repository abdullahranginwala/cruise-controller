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
      return new Promise((resolve, reject) => {
        const multi = this.client.multi();
        multi.incr(key);
        multi.expire(key, Math.ceil(windowMs / 1000)); // expires key after windowMs seconds
        multi.exec((err, replies) => {
          if (err) return reject(err);
          resolve(replies[0]); // replies[0] will hold the new count for the key
        });
      });
    }
  
    get(key) {
      return new Promise((resolve, reject) => {
        this.client.get(key, (err, res) => {
          if (err) return reject(err);
          resolve(parseInt(res, 10) || 0);
        });
      });
    }
  }

  export default RedisStore;