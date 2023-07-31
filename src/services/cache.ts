import redis, { RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL;
const CHRON_ENV = process.env.CHRON_ENV;

export default class CacheManager {
  static instance: CacheManager;
  client: RedisClientType;

  public static getInstance(): CacheManager {
    if (!this.instance) this.instance = new CacheManager();
    return this.instance;
  }

  async connect() {
    this.client = redis.createClient({ url: REDIS_URL });
    await this.client.connect();
  }

  async disconnect() {
    await this.client.disconnect();
  }

  async get(route: string, key: string) {
    return await this.client.get(`${CHRON_ENV}:${route}::${key}`);
  }

  async set(route: string, key: string, value: string) {
    await this.client.set(`${CHRON_ENV}:${route}::${key}`, value, {
      EX: 2 * 60,
    });
  }

  async remove(key: string) {
    return this.client.del(key);
  }
}
