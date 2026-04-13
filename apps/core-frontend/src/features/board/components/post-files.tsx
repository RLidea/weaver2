'use client';

import Image from 'next/image';
import { usePostFiles } from '../hooks/use-post-files';
import type { PostFileItem } from '../api/upload.api';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function FileChip({ file }: { file: PostFileItem }) {
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      download={file.originalName}
      className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-text transition-colors hover:border-primary hover:text-primary"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="min-w-0 flex-1 truncate">{file.originalName}</span>
      <span className="shrink-0 text-xs text-text-muted">{formatBytes(file.size)}</span>
    </a>
  );
}

interface PostFilesProps {
  postId: string;
}

export function PostFiles({ postId }: PostFilesProps) {
  const { data: files = [], isLoading } = usePostFiles(postId);

  if (isLoading || files.length === 0) return null;

  const images = files.filter((f) => isImage(f.mimeType));
  const others = files.filter((f) => !isImage(f.mimeType));

  return (
    <div className="mt-6 space-y-4 border-t border-border pt-4">
      {/* 이미지 미리보기 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((file) => (
            <a
              key={file.id}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-video overflow-hidden rounded-md border border-border bg-surface-2"
            >
              <Image
                src={file.thumbnailUrl ?? file.url}
                alt={file.originalName}
                fill
                className="object-cover transition-opacity group-hover:opacity-80"
              />
            </a>
          ))}
        </div>
      )}

      {/* 일반 파일 */}
      {others.length > 0 && (
        <div className="space-y-1.5">
          {others.map((file) => (
            <FileChip key={file.id} file={file} />
          ))}
        </div>
      )}
    </div>
  );
}
