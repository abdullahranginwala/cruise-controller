class MemoryStore {
    constructor() {
      this.storage = new Map();
    }
  
    increment(key, windowMs) {
      const now = Date.now();
      const previousValue = this.storage.get(key);
      if (previousValue && previousValue.timestamp + windowMs > now) {
        previousValue.count++;
      } else {
        this.storage.set(key, { count: 1, timestamp: now });
      }
      return Promise.resolve(this.storage.get(key).count);
    }
  
    get(key) {
      const value = this.storage.get(key);
      return Promise.resolve(value ? value.count : 0);
    }
  }

  export default MemoryStore;