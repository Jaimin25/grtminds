'use server';

import prisma from '@/lib/db';
import HomePage from '@/components/Home';
import { fetchWikipediaData } from '@/lib/scrapeWikiData';
import { Pioneer, WikipediaInfo } from '@/lib/type';
import { redis } from '@/lib/redis';

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
    console.error('Database error:', error);
    throw new Error('Failed to fetch pioneers from database');
  }
}

async function getCachedPioneers(cacheKey: string) {
  try {
    const cached = await redis.get(cacheKey);
    return cached ? (JSON.parse(cached) as WikipediaInfo[]) : null;
  } catch (error) {
    console.error('Cache error:', error);
    return null;
  }
}

async function setCachedPioneers(cacheKey: string, data: WikipediaInfo[]) {
  try {
    await redis.set(cacheKey, JSON.stringify(data));
    await redis.expire(cacheKey, CACHE_EXPIRY);
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

async function fetchAndProcessWikipediaData(pioneers: Pioneer[]) {
  const results = await Promise.allSettled(
    pioneers.map((pioneer) => fetchWikipediaData(pioneer)),
  );

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
      return cachedData;
    }

    const pioneers = await getPioneersFromDB({ lastId, page });
    if (pioneers.length === 0) {
      return [];
    }

    const processedData = await fetchAndProcessWikipediaData(pioneers);

    await setCachedPioneers(cacheKey, processedData);

    return processedData;
  } catch (error) {
    console.error('Error in loadPioneers:', error);
    throw new Error('Failed to load pioneers');
  }
}

export default async function Page() {
  try {
    const validData = await loadPioneers({ page: null, lastId: null });

    return (
      <main className='container mx-auto mt-12 w-full'>
        <HomePage pioneers={validData} />
      </main>
    );
  } catch (error) {
    console.error('Page error:', error);
    return (
      <main className='container mx-auto mt-12 w-full'>
        <div className='text-center text-red-500'>
          Failed to load pioneers. Please try again later.
        </div>
      </main>
    );
  }
}
