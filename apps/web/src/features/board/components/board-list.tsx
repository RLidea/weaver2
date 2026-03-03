'use client';

import Link from 'next/link';
import { useBoards } from '../hooks/use-boards';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Spinner } from '@/shared/components/ui/spinner';

export function BoardList() {
  const { data: boards = [], isLoading } = useBoards();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-text">게시판</h1>

      {boards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-sm text-text-muted">게시판이 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <Link key={board.id} href={`/boards/${board.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="py-5">
                  <h2 className="font-semibold text-text">{board.name}</h2>
                  {board.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-text-muted">
                      {board.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
