import { redirect } from 'next/navigation';

export default function AdminBoardsPage() {
  redirect('/admin/content?tab=boards');
}
