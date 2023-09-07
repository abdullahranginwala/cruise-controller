const axios = require('axios');
const express = require('express');
const RateLimiter = require('../src/index');
const MemoryStore = require('../src/stores/memoryStore');

const createServer = (rateLimiter) => {
    const app = express();
    app.use(rateLimiter.middleware());
    app.get('/', (req, res) => res.sendStatus(200));
  
    const server = app.listen(3000);
  
    // Track all connections
    const connections = new Set();
    server.on('connection', (connection) => {
      connections.add(connection);
      connection.on('close', () => connections.delete(connection));
    });
  
    // Attach connections to server
    server.connections = connections;
  
    return server;
  };
  
  const closeServer = (server) => {
    return new Promise((resolve, reject) => {
      // Close all connections
      for (const connection of server.connections) {
        connection.destroy();
      }
  
      server.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

describe('RateLimiter', () => {
  let server;
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: 5,
    });

    server = createServer(rateLimiter);
  });

  afterEach(async () => {
    await closeServer(server);
  });

  // Core functionality
  test('should limit request rate', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await axios.get('http://localhost:3000');
      expect(response.status).toBe(200);
    }

    await expect(axios.get('http://localhost:3000')).rejects.toThrow('Request failed with status code 429');
  });

  // Whitelisting and blacklisting
  test('should allow whitelisted IP', async () => {
    rateLimiter.whitelist.push('::1');

    for (let i = 0; i < 10; i++) {
      const response = await axios.get('http://localhost:3000');
      expect(response.status).toBe(200);
    }

    rateLimiter.whitelist = [];
  });

  test('should block blacklisted IP', async () => {
    rateLimiter.blacklist.push('::1');

    await expect(axios.get('http://localhost:3000')).rejects.toThrow('Request failed with status code 429');

    rateLimiter.blacklist = [];
  });

  // Edge cases
  test('should not limit request rate if max is set to 0', async () => {
    rateLimiter.max = 0;

    for (let i = 0; i < 10; i++) {
      const response = await axios.get('http://localhost:3000');
      expect(response.status).toBe(200);
    }

    rateLimiter.max = 5;
  });

  test('should limit request rate instantly if windowMs is very small', async () => {
    rateLimiter.windowMs = 1;

    await expect(axios.get('http://localhost:3000')).rejects.toThrow('Request failed with status code 429');

    rateLimiter.windowMs = 60 * 1000;
  });

  // Exponential Backoff
  test('should introduce delay for rate limiting', async () => {
      rateLimiter.enableExponentialBackoff = true;

      for (let i = 0; i < 5; i++) {
        await axios.get('http://localhost:3000');
      }

      const baseDelay = 1;

      for (let i = 0; i < 5; i++) {
          const start = Date.now();
          const response = await axios.get('http://localhost:3000');
          const end = Date.now();
          expect(response.status).toBe(200);
          expect(end - start).toBeGreaterThanOrEqual(baseDelay**(i+1) * 1000);
      }
  }, 65000)
});