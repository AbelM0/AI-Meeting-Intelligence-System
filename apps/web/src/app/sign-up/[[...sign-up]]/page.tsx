import { SignUp } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';

export default function SignUpPage() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center bg-background px-4 py-12">
      <ThemeToggle className="absolute right-5 top-5" />
      <SignUp fallbackRedirectUrl="/meetings" />
    </main>
  );
}
