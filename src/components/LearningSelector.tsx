import { useState, useEffect } from 'react';
import { fetchText, fetchTextIndex } from '@/lib/sefaria/api';
import { UserProgress, TorahText } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

// Define types for our component
interface TractateInfo {
  title: string;
  heTitle: string;
  length: number; // Total dafim count
  section: string; // Which order it belongs to
}

interface SelectedDaf {
  tractate: string;
  daf: number; // 1-based index of the daf
  amud: 'a' | 'b'; // 'a' or 'b' side
}

const learnedRef = (selected: SelectedDaf) => {
  return `${selected.tractate}.${selected.daf}${selected.amud}`;
};

export default function LearningSelector() {
  const [tractates, setTractates] = useState<TractateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTractate, setSelectedTractate] = useState<TractateInfo | null>(null);
  const [learnedDafim, setLearnedDafim] = useState<Set<string>>(new Set());
  const [selectingDafim, setSelectingDafim] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tractate list from the user's input - these are the Bavli tractates with correct lengths
  const bavliTractates = [
    { title: "Berakhot", heTitle: "ברכות", section: "Seder Zeraim", length: 64 },
    { title: "Shabbat", heTitle: "שבת", section: "Seder Moed", length: 157 },
    { title: "Eruvin", heTitle: "עירובין", section: "Seder Moed", length: 105 },
    { title: "Pesachim", heTitle: "פסחים", section: "Seder Moed", length: 121 },
    { title: "Rosh Hashanah", heTitle: "ראש השנה", section: "Seder Moed", length: 35 },
    { title: "Yoma", heTitle: "יומא", section: "Seder Moed", length: 88 },
    { title: "Sukkah", heTitle: "סוכה", section: "Seder Moed", length: 56 },
    { title: "Beitzah", heTitle: "ביצה", section: "Seder Moed", length: 40 },
    { title: "Taanit", heTitle: "תענית", section: "Seder Moed", length: 31 },
    { title: "Megillah", heTitle: "מגילה", section: "Seder Moed", length: 32 },
    { title: "Moed Katan", heTitle: "מועד קטן", section: "Seder Moed", length: 29 },
    { title: "Chagigah", heTitle: "חגיגה", section: "Seder Moed", length: 27 },
    { title: "Yevamot", heTitle: "יבמות", section: "Seder Nashim", length: 122 },
    { title: "Ketubot", heTitle: "כתובות", section: "Seder Nashim", length: 112 },
    { title: "Nedarim", heTitle: "נדרים", section: "Seder Nashim", length: 91 },
    { title: "Nazir", heTitle: "נזיר", section: "Seder Nashim", length: 66 },
    { title: "Sotah", heTitle: "סוטה", section: "Seder Nashim", length: 49 },
    { title: "Gittin", heTitle: "גיטין", section: "Seder Nashim", length: 90 },
    { title: "Kiddushin", heTitle: "קידושין", section: "Seder Nashim", length: 82 },
    { title: "Bava Kamma", heTitle: "בבא קמא", section: "Seder Nezikin", length: 119 },
    { title: "Bava Metzia", heTitle: "בבא מציעא", section: "Seder Nezikin", length: 119 },
    { title: "Bava Batra", heTitle: "בבא בתרא", section: "Seder Nezikin", length: 176 },
    { title: "Sanhedrin", heTitle: "סנהדרין", section: "Seder Nezikin", length: 113 },
    { title: "Makkot", heTitle: "מכות", section: "Seder Nezikin", length: 24 },
    { title: "Shevuot", heTitle: "שבועות", section: "Seder Nezikin", length: 49 },
    { title: "Avodah Zarah", heTitle: "עבודה זרה", section: "Seder Nezikin", length: 76 },
    { title: "Horayot", heTitle: "הוריות", section: "Seder Nezikin", length: 14 },
    { title: "Zevachim", heTitle: "זבחים", section: "Seder Kodashim", length: 120 },
    { title: "Menachot", heTitle: "מנחות", section: "Seder Kodashim", length: 110 },
    { title: "Chullin", heTitle: "חולין", section: "Seder Kodashim", length: 142 },
    { title: "Bekhorot", heTitle: "בכורות", section: "Seder Kodashim", length: 61 },
    { title: "Arakhin", heTitle: "ערכין", section: "Seder Kodashim", length: 34 },
    { title: "Temurah", heTitle: "תמורה", section: "Seder Kodashim", length: 34 },
    { title: "Keritot", heTitle: "כריתות", section: "Seder Kodashim", length: 28 },
    { title: "Meilah", heTitle: "מעילה", section: "Seder Kodashim", length: 22 },
    { title: "Tamid", heTitle: "תמיד", section: "Seder Kodashim", length: 9 },
    { title: "Niddah", heTitle: "נדה", section: "Seder Tahorot", length: 73 }
  ];

  // Fetch tractate info and user progress
  useEffect(() => {
    const fetchTractateInfo = async () => {
      try {
        setLoading(true);
        // We'll use the pre-defined lengths instead of fetching from Sefaria API
        setTractates(bavliTractates);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tractate info:', error);
        setError('Failed to load tractate information');
        setLoading(false);
      }
    };

    // Fetch user's learning progress
    const fetchUserProgress = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setError('You need to be logged in to track your learning progress');
          return;
        }
        
        console.log('Fetching progress for user:', session.user.id);
        
        const { data, error } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', session.user.id);
        
        if (error) throw error;
        
        console.log('User progress data:', data);
        
        // Create a set of refs that the user has learned
        const learned = new Set<string>();
        data.forEach((progress: UserProgress) => {
          if (progress.is_completed) {
            learned.add(progress.ref);
          }
        });
        
        console.log('Learned refs:', Array.from(learned));
        setLearnedDafim(learned);
      } catch (error) {
        console.error('Error fetching user progress:', error);
        setError('Failed to load your learning progress');
      }
    };

    fetchTractateInfo();
    fetchUserProgress();
  }, []);

  // Group tractates by seder (order)
  const tractatesBySeder: Record<string, TractateInfo[]> = tractates.reduce((acc, tractate) => {
    if (!acc[tractate.section]) {
      acc[tractate.section] = [];
    }
    acc[tractate.section].push(tractate);
    return acc;
  }, {} as Record<string, TractateInfo[]>);

  // Handle selecting a full tractate
  const handleSelectTractate = async (tractate: TractateInfo) => {
    setSelectedTractate(tractate);
    setSelectingDafim(true);
  };

  // Toggle a single daf as learned/not learned
  const toggleDaf = async (daf: SelectedDaf) => {
    try {
      const ref = learnedRef(daf);
      const isCurrentlyLearned = learnedDafim.has(ref);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You need to be logged in to save your progress');
        return;
      }
      
      if (isCurrentlyLearned) {
        // Remove from learned
        const { error } = await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', session.user.id)
          .eq('ref', ref);
        
        if (error) throw error;
        
        // Update local state
        const newLearned = new Set(learnedDafim);
        newLearned.delete(ref);
        setLearnedDafim(newLearned);
      } else {
        // Try using the stored procedure first
        console.log(`Marking ${ref} as learned using RPC...`);
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('mark_daf_learned', {
            p_user_id: session.user.id,
            p_ref: ref,
            p_completed_at: new Date().toISOString()
          });
        
        // If the RPC fails, fall back to direct insert
        if (rpcError) {
          console.error('RPC Error:', rpcError);
          console.log('Falling back to direct insert...');
          
          // Add to user_progress - IMPORTANT: Use snake_case column names
          const { data: insertData, error: insertError } = await supabase
            .from('user_progress')
            .upsert({
              user_id: session.user.id,
              ref,
              is_completed: true,
              completed_at: new Date().toISOString()
            }, { onConflict: 'user_id, ref' });
          
          if (insertError) {
            console.error('Direct insert error:', insertError);
            throw insertError;
          }
          
          console.log('Direct insert successful:', insertData);
        } else {
          console.log('RPC call successful:', rpcData);
        }
        
        // Let's test if the insertion worked
        console.log(`Verifying insertion for ${ref}...`);
        const { data, error: testError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('ref', ref)
          .single();
          
        if (testError) {
          console.error('Cannot verify insertion:', testError);
        } else {
          console.log('Successfully verified insertion:', data);
        }
        
        // Update local state
        setLearnedDafim(new Set([...learnedDafim, ref]));
      }
    } catch (error) {
      console.error('Error toggling daf status:', error);
      setError('Failed to save your progress');
    }
  };

  // Mark a tractate as fully learned
  const markTractateAsLearned = async (tractate: TractateInfo) => {
    try {
      setSavingProgress(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('You need to be logged in to save your progress');
        setSavingProgress(false);
        return;
      }
      
      // Create an array of all dafim in the tractate (both a and b sides)
      const dafimToMark: SelectedDaf[] = [];
      for (let i = 2; i <= tractate.length; i++) {
        dafimToMark.push({ tractate: tractate.title, daf: i, amud: 'a' });
        dafimToMark.push({ tractate: tractate.title, daf: i, amud: 'b' });
      }
      
      // Insert progress for each daf
      let successCount = 0;
      console.log(`Marking ${dafimToMark.length} dafim as learned...`);
      
      for (const daf of dafimToMark) {
        const ref = learnedRef(daf);
        
        try {
          // Try using the stored procedure first
          console.log(`Marking ${ref} as learned...`);
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('mark_daf_learned', {
              p_user_id: session.user.id,
              p_ref: ref,
              p_completed_at: new Date().toISOString()
            });
          
          // If the RPC fails, fall back to direct insert
          if (rpcError) {
            console.warn('Stored procedure failed for', ref, 'Error:', rpcError);
            console.log('Using fallback method for', ref);
            
            // Add to user_progress directly - IMPORTANT: Use snake_case column names
            const { error: insertError } = await supabase
              .from('user_progress')
              .upsert({
                user_id: session.user.id,
                ref,
                is_completed: true,
                completed_at: new Date().toISOString()
              }, { onConflict: 'user_id, ref' });
            
            if (insertError) {
              console.error('Direct insert error for', ref, ':', insertError);
              throw insertError;
            }
          } else {
            console.log('RPC call successful for', ref);
          }
          
          // Add to local state
          setLearnedDafim(prev => new Set([...prev, ref]));
          successCount++;
        } catch (dafError) {
          console.error(`Error marking daf ${ref} as learned:`, dafError);
          // Continue with other dafim even if one fails
        }
      }
      
      console.log(`Successfully marked ${successCount} out of ${dafimToMark.length} dafim as learned`);
      setSavingProgress(false);
    } catch (error) {
      console.error('Error marking tractate as learned:', error);
      setError('Failed to save your progress');
      setSavingProgress(false);
    }
  };

  // Render dafim selection UI for a specific tractate
  const renderDafimSelection = () => {
    if (!selectedTractate) return null;
    
    // Calculate how many dafim have been learned in this tractate
    let learnedCount = 0;
    const totalAmudim = (selectedTractate.length - 1) * 2; // Start from daf 2, count both sides
    
    for (let i = 2; i <= selectedTractate.length; i++) {
      const refA = learnedRef({ tractate: selectedTractate.title, daf: i, amud: 'a' });
      const refB = learnedRef({ tractate: selectedTractate.title, daf: i, amud: 'b' });
      
      if (learnedDafim.has(refA)) learnedCount++;
      if (learnedDafim.has(refB)) learnedCount++;
    }
    
    const progressPercentage = totalAmudim > 0 ? Math.round((learnedCount / totalAmudim) * 100) : 0;

    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              {selectedTractate.title}
              <span className="text-sm font-normal text-gray-400 ml-2">({selectedTractate.heTitle})</span>
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {selectedTractate.length - 1} dapim | {totalAmudim} amudim
            </p>
          </div>
          
          <button
            onClick={() => setSelectingDafim(false)}
            className="px-3 py-1.5 bg-gray-700 rounded-lg shadow-lg text-gray-200 hover:bg-gray-600 hover:text-blue-300 flex items-center gap-2 transition-colors border border-gray-600 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Back to Tractates
          </button>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm text-gray-400">Progress</div>
            <div className="text-sm font-medium text-blue-300">{progressPercentage}% ({learnedCount}/{totalAmudim})</div>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => markTractateAsLearned(selectedTractate)}
            disabled={savingProgress}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingProgress ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Mark All as Learned
              </>
            )}
          </button>
        </div>
        
        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-4">Select Dafim</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: selectedTractate.length - 1 }, (_, i) => i + 2).map(daf => {
              const refA = learnedRef({ tractate: selectedTractate.title, daf, amud: 'a' });
              const refB = learnedRef({ tractate: selectedTractate.title, daf, amud: 'b' });
              
              const isALearned = learnedDafim.has(refA);
              const isBLearned = learnedDafim.has(refB);
              
              return (
                <div key={daf} className="bg-gray-700/70 backdrop-blur-sm rounded-lg p-2 border border-gray-600">
                  <div className="text-center mb-2 text-gray-300 font-medium">Daf {daf}</div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => toggleDaf({ tractate: selectedTractate.title, daf, amud: 'a' })}
                      className={`p-2 rounded-md flex justify-center transition-colors ${
                        isALearned 
                          ? 'bg-indigo-500/20 text-blue-300 border border-indigo-500/30'
                          : 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500'
                      }`}
                    >
                      {isALearned ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : 'A'}
                    </button>
                    
                    <button
                      onClick={() => toggleDaf({ tractate: selectedTractate.title, daf, amud: 'b' })}
                      className={`p-2 rounded-md flex justify-center transition-colors ${
                        isBLearned 
                          ? 'bg-indigo-500/20 text-blue-300 border border-indigo-500/30'
                          : 'bg-gray-600 text-gray-300 border border-gray-500 hover:bg-gray-500'
                      }`}
                    >
                      {isBLearned ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : 'B'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700 flex justify-center items-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 bg-blue-500/10 rounded-full"></div>
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full animate-ping-slow"></div>
            <div className="absolute inset-2 bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <div className="text-sm text-gray-300">Loading tractates...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <div className="flex items-start text-red-400">
          <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="font-medium">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show dafim selection if a tractate is selected
  if (selectingDafim && selectedTractate) {
    return renderDafimSelection();
  }
  
  // Otherwise, show the list of tractates
  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
        Select a Tractate
      </h2>
      
      {Object.entries(tractatesBySeder).map(([seder, sederTractates]) => (
        <div key={seder} className="mb-8 last:mb-0">
          <h3 className="text-lg font-medium text-white mb-3 border-b border-gray-700 pb-2">
            {seder}
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sederTractates.map((tractate) => {
              // Calculate how many dafim have been learned in this tractate
              let learnedCount = 0;
              const totalAmudim = (tractate.length - 1) * 2; // Start from daf 2, count both sides
              
              for (let i = 2; i <= tractate.length; i++) {
                const refA = learnedRef({ tractate: tractate.title, daf: i, amud: 'a' });
                const refB = learnedRef({ tractate: tractate.title, daf: i, amud: 'b' });
                
                if (learnedDafim.has(refA)) learnedCount++;
                if (learnedDafim.has(refB)) learnedCount++;
              }
              
              const progressPercentage = totalAmudim > 0 ? Math.round((learnedCount / totalAmudim) * 100) : 0;
              
              return (
                <div 
                  key={tractate.title}
                  className="bg-gray-700/70 backdrop-blur-sm rounded-lg border border-gray-600 p-4 hover:bg-gray-700 hover:border-gray-500 transition-colors cursor-pointer group"
                  onClick={() => handleSelectTractate(tractate)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-100 group-hover:text-blue-300 transition-colors">{tractate.title}</h4>
                      <p className="text-gray-400 text-sm">{tractate.heTitle}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full text-gray-300">
                        {tractate.length - 1} dapim
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs text-gray-400">Progress</div>
                      <div className="text-xs font-medium text-blue-300">{progressPercentage}%</div>
                    </div>
                    <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
} 