"use client";

import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "@/actions/auth";
import { useFormStatus } from "react-dom";

function DeleteButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      variant="destructive"
      disabled={pending}
    >
      {pending ? "Deleting..." : "Delete Account"}
    </Button>
  );
}

export function DeleteAccountButton() {
  const handleSubmit = (e: React.FormEvent) => {
    // Show confirmation dialog before submitting
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.')) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteAccountAction} onSubmit={handleSubmit}>
      <DeleteButton />
    </form>
  );
} 