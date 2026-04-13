'use client';

import Image from 'next/image';
import { useUserProfile } from '../hooks/use-user-profile';
import { useUserPosts } from '../hooks/use-user-posts';
import { PostListItem } from '@/features/board/components/post-list-item';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Spinner } from '@/shared/components/ui/spinner';
import type { Post } from '@/features/board/types';

interface UserProfileViewProps {
  username: string;
}

function Avatar({ user }: { user: { displayName: string; profileImageUrl: string | null } }) {
  const initial = user.displayName.charAt(0).toUpperCase();

  if (user.profileImageUrl) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
        <Image
          src={user.profileImageUrl}
          alt={user.displayName}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-fg">
      {initial}
    </div>
  );
}

export function UserProfileView({ username }: UserProfileViewProps) {
  const { data: user, isLoading: userLoading } = useUserProfile(username);

  const {
    data: postsData,
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserPosts(user?.id ?? '');

  if (userLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-text-muted">사용자를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const posts = postsData?.pages.flatMap((page) => {
    const data = page.data as { data: Post[] };
    return data.data;
  }) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 프로필 카드 */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <Avatar user={user} />
            <div>
              <p className="text-lg font-semibold text-text">{user.displayName}</p>
              <p className="text-sm text-text-muted">@{user.username}</p>
            </div>
          </div>
          {posts.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-sm text-text-muted">
                게시글 <span className="font-semibold text-text">{posts.length}+</span>개
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 게시글 목록 */}
      <div>
        <p className="mb-3 text-sm font-semibold text-text">작성한 게시글</p>
        <Card>
          {postsLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-text-muted">작성한 게시글이 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {posts.map((post) => (
                  <PostListItem key={post.id} post={post} boardId={post.boardId} />
                ))}
              </div>
              {hasNextPage && (
                <div className="border-t border-border px-4 py-3 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    isLoading={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                  >
                    더 보기
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
