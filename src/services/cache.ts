import redis, { RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL;

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

  async get(key: string) {
    return await this.client.get(key);
  }
  async set(key: string, value: string) {
    await this.client.set(key, value, { EX: 2 * 60 });
  }
  async remove(key: string) {
    return this.client.del(key);
  }
}
