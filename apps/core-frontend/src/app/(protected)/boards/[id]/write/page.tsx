import { PostForm } from '@/features/board/components/post-form';

interface WritePageProps {
  params: Promise<{ id: string }>;
}

export default async function WritePage({ params }: WritePageProps) {
  const { id } = await params;
  return <PostForm boardId={id} />;
}
