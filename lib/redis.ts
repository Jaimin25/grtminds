import Redis from 'ioredis';

const redisClient = () => {
  const redis = new Redis(
    process.env.NODE_ENV === 'development'
      ? process.env.LOCAL_REDIS!
      : process.env.CLOUD_REDIS!,
  );

  redis.on('connect', () => {
    console.log('Connected to redis');
  });

  redis.on('error', (err) => console.log((err as Error).message));
  return redis;
};

export const redis = redisClient();
