"use client";

import { signInWithGithub } from "@/actions/auth";
import React, { useTransition } from "react";
import { Button } from "./ui/button";

const LoginGithub = () => {
  const [isPending, startTransition] = useTransition();

  const handleGithubLogin = () => {
    startTransition(async () => {
      await signInWithGithub();
    });
  };
  return (
    <Button
      onClick={handleGithubLogin}
      className="w-full"
      variant="outline"
    >
      {isPending ? "Redirecting..." : "Continue with GitHub"}
    </Button>
  );
};

export default LoginGithub;
