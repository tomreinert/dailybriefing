"use client";

import { signInWithGoogle } from "@/actions/auth";
import React, { useTransition } from "react";
import { Button } from "./ui/button";

const LoginGoogle = () => {
  const [isPending, startTransition] = useTransition();

  const handleGoogleLogin = () => {
    startTransition(async () => {
      await signInWithGoogle();
    });
  };
  return (
    <Button
      onClick={handleGoogleLogin}
      variant="default"
      className="w-full"
    >
      {isPending ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
};

export default LoginGoogle; 