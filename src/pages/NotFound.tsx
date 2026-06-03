export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white text-zinc-900 p-6 text-center">
      <h1 className="text-6xl font-black text-zinc-200 mb-4">404</h1>
      <p className="text-2xl font-bold text-zinc-800 mb-2">Page Not Found</p>
      <p className="text-zinc-500 max-w-sm">The page you're looking for doesn't exist.</p>
    </div>
  );
}
