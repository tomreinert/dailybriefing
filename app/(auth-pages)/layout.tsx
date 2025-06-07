export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-12 items-center w-full max-w-md mx-auto">
      {children}
    </div>
  );
}
