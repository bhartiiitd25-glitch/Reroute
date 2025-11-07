import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-6xl">🔍</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Share Not Found</h1>
        <p className="mb-6 text-gray-600">
          This route share doesn&apos;t exist or may have been deleted.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

