import { PostDetail } from '@/project/board/components/post-detail';

interface PostPageProps {
  params: Promise<{ id: string; postId: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id, postId } = await params;
  return <PostDetail boardId={id} postId={postId} />;
}
