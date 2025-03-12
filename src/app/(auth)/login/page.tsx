import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden">
        
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-500/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/3 blur-3xl rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-1/4 h-1/4 bg-indigo-500/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="max-w-md w-full z-10">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-3">
            Torah Quiz
          </h1>
          <p className="text-gray-300 text-lg">
            Track your Torah study and test your knowledge
          </p>
        </div>
        
        <div className="backdrop-blur-sm bg-gray-800/70 p-8 rounded-xl shadow-2xl border border-gray-700">
          <AuthForm />
        </div>
        
        <div className="mt-8 text-center text-sm text-gray-400">
          Encouraging Chazarah through a beautiful modern interface
        </div>
      </div>
    </div>
  );
} 