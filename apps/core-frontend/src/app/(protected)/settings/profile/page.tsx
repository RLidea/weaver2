import { ProfileForm } from '@/core/user/components/settings/profile-form';
import { DeleteAccountSection } from '@/core/user/components/settings/delete-account-section';

export default function SettingsProfilePage() {
  return (
    <div className="space-y-6">
      <ProfileForm />
      <DeleteAccountSection />
    </div>
  );
}
