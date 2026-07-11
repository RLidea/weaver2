'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCreatePost } from '../hooks/use-post-mutations';
import { useBoard } from '../hooks/use-board';
import { uploadApi } from '../api/upload.api';
import { Button, Card, CardContent, CardFooter, CardHeader, ChevronLeftIcon, Input, useToast } from '@weaver2/ui';

const MAX_FILES = 10;
const MAX_SIZE_MB = 50;

interface PostFormProps {
  boardId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostForm({ boardId }: PostFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { data: board } = useBoard(boardId);
  const { mutate: createPost, isPending } = useCreatePost();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitting = isPending || isUploading;
  const isValid = title.trim().length > 0 && content.trim().length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const merged = [...files, ...selected].slice(0, MAX_FILES);
    const oversized = merged.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${MAX_SIZE_MB}MB 이하 파일만 첨부할 수 있습니다.`);
      return;
    }
    setFiles(merged);
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    createPost(
      { boardId, title: title.trim(), content: content.trim() },
      {
        onSuccess: async (res) => {
          const postId = res.data.id;

          if (files.length > 0) {
            setIsUploading(true);
            try {
              await uploadApi.uploadFiles(files, postId);
            } catch {
              toast.error('파일 업로드 중 오류가 발생했습니다. 게시글은 저장되었습니다.');
            } finally {
              setIsUploading(false);
            }
          }

          router.push(`/boards/${boardId}/posts/${postId}`);
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
              disabled={isSubmitting}
            />
          </CardHeader>

          <CardContent className="py-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요."
              rows={16}
              disabled={isSubmitting}
              className="w-full resize-none bg-transparent py-4 text-sm leading-relaxed text-text placeholder:text-text-muted focus:outline-none disabled:opacity-50"
            />

            {/* 첨부 파일 목록 */}
            {files.length > 0 && (
              <div className="mb-4 space-y-1.5 border-t border-border pt-4">
                <p className="text-xs text-text-muted">첨부 파일 ({files.length}/{MAX_FILES})</p>
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{file.name}</span>
                    <span className="shrink-0 text-xs text-text-muted">{formatBytes(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-text-muted transition-colors hover:text-error"
                      aria-label="파일 제거"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-2">
            {/* 파일 첨부 버튼 */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting || files.length >= MAX_FILES}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || files.length >= MAX_FILES}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                파일 첨부
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/boards/${boardId}`)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isSubmitting}
                isLoading={isSubmitting}
              >
                {isUploading ? '업로드 중...' : '등록'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
