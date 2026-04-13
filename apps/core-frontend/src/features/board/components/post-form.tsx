'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePost } from '../hooks/use-post-mutations';
import { useBoard } from '../hooks/use-board';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { ChevronLeftIcon } from '@/shared/components/ui/icons';

interface PostFormProps {
  boardId: string;
}

export function PostForm({ boardId }: PostFormProps) {
  const router = useRouter();
  const { data: board } = useBoard(boardId);
  const { mutate: createPost, isPending } = useCreatePost();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const isValid = title.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    createPost(
      { boardId, title: title.trim(), content: content.trim() },
      {
        onSuccess: (res) => {
          router.push(`/boards/${boardId}/posts/${res.data.id}`);
        },
      },
    );
  };

  return (
    <div className="max-w-4xl space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href={`/boards/${boardId}`}
          aria-label="게시판으로"
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-text">글쓰기</h1>
          {board?.name && (
            <p className="mt-0.5 text-sm text-text-muted">{board.name}</p>
          )}
        </div>
      </div>

      {/* 폼 */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              maxLength={200}
              className="border-0 bg-transparent px-0 text-lg font-semibold focus:ring-0"
              disabled={isPending}
            />
          </CardHeader>

          <CardContent className="py-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요."
              rows={16}
              disabled={isPending}
              className="w-full resize-none bg-transparent py-4 text-sm leading-relaxed text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/boards/${boardId}`)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isPending}
              isLoading={isPending}
            >
              등록
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
