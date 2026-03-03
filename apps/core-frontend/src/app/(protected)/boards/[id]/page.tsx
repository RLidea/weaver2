import { BoardDetail } from '@/features/board/components/board-detail';

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;
  return <BoardDetail boardId={id} />;
}
