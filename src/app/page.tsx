import Link from 'next/link';

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">WiFi Speed Test Demo</h1>
      <p className="text-lg mb-6">Measure and compare WiFi speeds across different locations</p>
      
      <div className="flex gap-4">
        <Link
          href="/speed-test"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Start Speed Test
        </Link>
      </div>
    </div>
  );
}
