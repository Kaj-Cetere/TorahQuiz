import SupabaseConnectionTest from '@/components/SupabaseConnectionTest';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-center mb-8">Torah Quiz - Connection Test</h1>
        
        <SupabaseConnectionTest />
        
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
}