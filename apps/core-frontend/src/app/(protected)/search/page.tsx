import { Suspense } from 'react';
import { SearchPageView } from '@/features/search/components/search-page-view';

export const metadata = { title: '검색' };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageView />
    </Suspense>
  );
}
