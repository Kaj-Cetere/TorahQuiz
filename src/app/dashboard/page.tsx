'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import QuizGenerationPopup from '@/components/QuizGenerationPopup';
import { QuizSettings, QuizTopicSelection } from '@/lib/types';
import QuizSettingsComponent from '@/components/QuizSettings';

// Define the user progress interface
interface UserProgress {
  ref: string;
  completed_at: string;
  is_completed: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [showQuizPopup, setShowQuizPopup] = useState(false);
  const [showQuizSettings, setShowQuizSettings] = useState(false);
  const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login');
        return;
      }

      // Fetch user progress from Supabase
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('ref, completed_at, is_completed')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false });

        if (error) throw error;
        setProgress(data || []);
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // Try to load saved quiz settings
    const savedSettings = localStorage.getItem('quizSettings');
    if (savedSettings) {
      try {
        setQuizSettings(JSON.parse(savedSettings));
      } catch (err) {
        console.error('Error parsing saved quiz settings:', err);
      }
    }
  }, [router]);

  // Function to handle signing out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Handle quiz generation
  const handleGenerateQuiz = () => {
    setShowQuizPopup(true);
  };

  // Handle saving quiz settings
  const handleSaveQuizSettings = (settings: QuizSettings) => {
    setQuizSettings(settings);
    localStorage.setItem('quizSettings', JSON.stringify(settings));
    setSettingsSaved(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSettingsSaved(false);
    }, 3000);
  };

  // Handle topic selection from popup
  const handleTopicSelected = async (topicSelection: QuizTopicSelection) => {
    try {
      if (!quizSettings || !user) {
        console.error('Quiz settings or user not available');
        return;
      }
      
      // Save topic selection to localStorage for use in generate page
      localStorage.setItem('quizTopicSelection', JSON.stringify(topicSelection));
      
      // Hide popup and navigate to the quiz generation page
      setShowQuizPopup(false);
      router.push('/dashboard/quiz/generate');
    } catch (err) {
      console.error('Error handling quiz topic selection:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[70vh] bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping-slow"></div>
            <div className="absolute inset-2 bg-gray-800 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="h-4 bg-gray-800 rounded w-48 mb-2.5"></div>
          <div className="h-3 bg-gray-700 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Group progress by tractate
  const progressByTractate = progress.reduce<Record<string, UserProgress[]>>((acc, item) => {
    const parts = item.ref.split('.');
    if (parts.length > 0) {
      const tractate = parts[0];
      if (!acc[tractate]) {
        acc[tractate] = [];
      }
      acc[tractate].push(item);
    }
    return acc;
  }, {});

  // Calculate total amudim learned
  const totalAmudimLearned = progress.length;
  
  // Calculate progress in the last 7 days
  const recentActivity = progress.filter(p => 
    new Date(p.completed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="min-h-screen text-gray-100">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-indigo-600/3 blur-3xl rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-600/3 blur-3xl rounded-full"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10">
        <header className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
                Welcome to Your Torah Quizician Dashboard
              </h1>
              <p className="text-gray-400 max-w-3xl">
                Track your learning progress, generate personalized quizzes, and solidify your Torah knowledge.
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 bg-gray-800 rounded-lg shadow-lg text-gray-200 hover:bg-gray-700 flex items-center gap-2 transition-colors border border-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V9.5a.5.5 0 011 0V16a2 2 0 01-2 2H3a2 2 0 01-2-2V4a2 2 0 012-2h9.5a.5.5 0 010 1H3z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M15.854 4.646a.5.5 0 010 .708l-7.5 7.5a.5.5 0 01-.708 0l-3.5-3.5a.5.5 0 11.708-.708L8 11.293l7.146-7.147a.5.5 0 01.708 0z" clipRule="evenodd" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Stats Section */}
        <section className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700">
              <div className="px-6 py-5 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-100">Progress Overview</h2>
                  <div className="p-2 rounded-full bg-indigo-500/10">
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
                      <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900/50 border border-indigo-500/10 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
                    <div className="relative">
                      <dt className="text-sm font-medium text-indigo-200 truncate mb-1">
                        Total Learned
                      </dt>
                      <dd className="text-3xl font-bold text-indigo-200">
                        {Math.floor(totalAmudimLearned / 2)}
                      </dd>
                      <dd className="text-xs text-indigo-300 mt-1">Daf (pages)</dd>
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-blue-500/10 rounded-lg p-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                    <div className="relative">
                      <dt className="text-sm font-medium text-blue-200 truncate mb-1">
                        This Week
                      </dt>
                      <dd className="text-3xl font-bold text-blue-200">
                      {Math.floor(recentActivity / 2)}
                      </dd>
                      <dd className="text-xs text-blue-300 mt-1">in the last 7 days</dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700">
              <div className="px-6 py-5 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-100">Quick Actions</h2>
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleGenerateQuiz}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-lg font-medium text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-colors border border-indigo-500/10 relative overflow-hidden group"
                  disabled={!quizSettings}
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity"></span>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  Generate Quiz
                </button>
                {!quizSettings && (
                  <div className="text-amber-400 text-center text-sm">
                    Configure quiz settings below first
                  </div>
                )}
                <Link
                  href="/dashboard/learning"
                  className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-lg font-medium text-gray-100 bg-gray-700/50 hover:bg-gray-700 transition-colors border border-gray-600"
                >
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Track Your Learning
                </Link>
                <button
                  onClick={() => setShowQuizSettings(!showQuizSettings)}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-lg font-medium text-gray-100 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-colors border-0 shadow-[0_0_0_1px_rgba(168,85,247,0.2)]"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {showQuizSettings ? 'Hide Quiz Settings' : 'Configure Quiz Settings'}
                </button>
              </div>
            </div>

            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl overflow-hidden border border-gray-700">
              <div className="px-6 py-5 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-100">Recent Activity</h2>
                  <div className="p-2 rounded-full bg-indigo-500/10">
                    <svg className="w-5 h-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {progress.length === 0 ? (
                  <div className="text-gray-400 text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <p>You haven't marked any texts as completed yet.</p>
                    <p className="text-sm mt-2">Start tracking your progress!</p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {progress.slice(0, 8).map((item, index) => (
                      <li key={index} className="text-sm py-2 px-3 bg-gray-700/50 rounded-lg flex items-center justify-between border border-gray-600/30">
                        <span className="font-medium text-gray-100">{item.ref}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(item.completed_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quiz Settings Section */}
        {showQuizSettings && (
          <section className="mb-10 animate-fadeIn">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-6 border border-purple-500/30">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-purple-500/20 rounded-full mr-3">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                  Quiz Settings
                </h2>
              </div>
              
              {settingsSaved && (
                <div className="mb-6 bg-green-900/30 border border-green-600/30 rounded-lg p-3 text-green-400 flex items-center animate-fadeIn">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Settings saved successfully!
                </div>
              )}
              
              <p className="text-gray-300 mb-6">
                Configure your quiz settings. These will be applied to all quizzes you generate.
              </p>
              
              <QuizSettingsComponent 
                initialSettings={quizSettings || undefined} 
                onSave={handleSaveQuizSettings} 
              />
            </div>
          </section>
        )}

        {/* Learning Journey Section */}
        <section className="mb-10">
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
              Your Gemara Learning Journey
            </h2>
            
            {Object.keys(progressByTractate).length === 0 ? (
              <div className="text-gray-400 text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                <p>You haven't marked any tractates as completed yet.</p>
                <p className="text-sm mt-2">Start your learning journey!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(progressByTractate).map(([tractate, items]) => (
                  <div key={tractate} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                    <h3 className="font-semibold text-lg text-blue-300 mb-2">{tractate}</h3>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm text-gray-300 font-medium">{items.length} amudim</span>
                    </div>
                    <Link 
                      href={`/dashboard/learning?tractate=${tractate}`}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center mt-2"
                    >
                      <span>View details</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      
      {/* Quiz Generation Popup */}
      {showQuizPopup && user && (
        <QuizGenerationPopup 
          userId={user.id}
          onGenerateQuiz={handleTopicSelected}
          onCancel={() => setShowQuizPopup(false)}
        />
      )}
    </div>
  );
} 