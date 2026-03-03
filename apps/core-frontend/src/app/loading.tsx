import { Spinner } from '@/shared/components/ui/spinner';

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}
