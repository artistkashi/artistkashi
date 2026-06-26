"use client";

import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => Promise<void>;
  onError?: () => void;
  isSubmitting?: boolean;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
}: GoogleLoginButtonProps) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      await onSuccess(response.credential);
    }
  };

  if (!googleClientId) {
    return null;
  }

  return (
    <div className="flex justify-center w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        theme="outline"
        size="large"
        shape="rectangular"
        text="continue_with"
        width="300"
      />
    </div>
  );
}
