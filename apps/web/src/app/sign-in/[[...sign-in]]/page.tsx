import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#f7f8fc] px-4 py-12">
      <SignIn fallbackRedirectUrl="/meetings" />
    </main>
  );
}
