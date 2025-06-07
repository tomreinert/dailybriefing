export type Message =
  | { success: string }
  | { error: string }
  | { message: string };

export function FormMessage({ message }: { message: Message }) {
  return (
    <div className="flex flex-col gap-2 w-full max-w-md text-sm mt-4">
      {"success" in message && (
        <div className="text-green-600 border-l-2 border-green-600 px-4 py-2 bg-green-50">
          {message.success}
        </div>
      )}
      {"error" in message && (
        <div className="text-red-600 border-l-2 border-red-600 px-4 py-2 bg-red-50">
          {message.error}
        </div>
      )}
      {"message" in message && (
        <div className="text-foreground border-l-2 px-4 py-2">
          {message.message}
        </div>
      )}
    </div>
  );
}
