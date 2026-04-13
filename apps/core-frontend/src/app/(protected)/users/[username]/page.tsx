import { UserProfileView } from '@/core/user/components/user-profile-view';

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  return <UserProfileView username={username} />;
}
