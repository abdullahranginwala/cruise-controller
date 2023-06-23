class MemoryStore {
  constructor() {
    this.storage = new Map();
  }

  increment(key, value = 1) {
    const currentValue = this.storage.get(key) || 0;
    const newValue = currentValue + value;
    this.storage.set(key, newValue);
    return Promise.resolve(newValue);
  }

  get(key) {
    return Promise.resolve(this.storage.get(key) || 0);
  }
}

module.exports = MemoryStore;