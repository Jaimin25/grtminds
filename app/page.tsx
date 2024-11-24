import HomePage from '@/components/Home';
import { loadPioneers } from './actions';

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
