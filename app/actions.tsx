'use server';

import { fetchWikipediaData } from '@/lib/scrapeWikiData';
import { Pioneer, WikipediaInfo } from '@/lib/type';
import { redis } from '@/lib/redis';
import prisma from '@/lib/db';
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  transports: [new winston.transports.Console()],
});

const PIONEERS_PER_PAGE = 10;
const CACHE_EXPIRY = 300;
const CACHE_PREFIX = 'pioneers:';

interface LoadPioneersParams {
  lastId: number | null;
  page: number | null;
}

async function getPioneersFromDB({ lastId, page }: LoadPioneersParams) {
  try {
    const skip = page && page > 1 ? (page - 1) * PIONEERS_PER_PAGE : 0;

    return await prisma.pioneer.findMany({
      orderBy: { name: 'asc' },
      take: PIONEERS_PER_PAGE,
      ...(lastId
        ? {
            skip: 1,
            cursor: { id: lastId },
          }
        : page && page > 1
          ? { skip }
          : {}),
    });
  } catch (error) {
    logger.info('Database error:', error);
    throw new Error('Failed to fetch pioneers from database');
  }
}

async function getCachedPioneers(cacheKey: string) {
  redis.connect();
  try {
    const cached = await redis.get(cacheKey);
    return cached ? (JSON.parse(cached) as WikipediaInfo[]) : null;
  } catch (error) {
    logger.error('Cache error:', error);
    return null;
  }
}

async function setCachedPioneers(cacheKey: string, data: WikipediaInfo[]) {
  try {
    const d = await redis.set(cacheKey, JSON.stringify(data));
    await redis.expire(cacheKey, CACHE_EXPIRY);
    logger.info('REDIS STORED', d);
  } catch (error) {
    logger.error('Cache set error:', error);
  }
  redis.disconnect();
}

async function fetchAndProcessWikipediaData(pioneers: Pioneer[]) {
  const results = await Promise.allSettled(
    pioneers.map((pioneer) => fetchWikipediaData(pioneer)),
  );
  logger.info('WIKI SCRAPED DATA', results);
  return results
    .filter(
      (result): result is PromiseFulfilledResult<WikipediaInfo> =>
        result.status === 'fulfilled' && result.value !== null,
    )
    .map((result) => result.value);
}

export async function loadPioneers({ lastId, page }: LoadPioneersParams) {
  try {
    const pageNo = page ?? 1;
    const cacheKey = `${CACHE_PREFIX}${pageNo}`;

    const cachedData = await getCachedPioneers(cacheKey);
    if (cachedData) {
      logger.info('CACHED DATA', cachedData);
      return cachedData;
    }

    const pioneers = await getPioneersFromDB({ lastId, page });
    logger.info('PIONEERS', pioneers);
    if (pioneers.length === 0) {
      return [];
    }

    const processedData = await fetchAndProcessWikipediaData(pioneers);

    await setCachedPioneers(cacheKey, processedData);

    return processedData;
  } catch (error) {
    logger.error('Error in loadPioneers:', error);
    throw new Error('Failed to load pioneers');
  }
}
