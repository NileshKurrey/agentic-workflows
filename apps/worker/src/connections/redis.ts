import { createClient, type RedisClientType } from "redis";

export type RedisClient = RedisClientType;

export function createRedisConnection(host: string, port: number): RedisClient {
  return createClient({
    socket: { host, port },
  });
}
