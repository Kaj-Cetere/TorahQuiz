import { useState, useEffect } from 'react';
import { QuizTopicSelection } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

interface QuizTopicSelectorProps {
  userId: string;
  onTopicSelected: (selection: QuizTopicSelection) => void;
  predefinedTopics?: string[]; // List of predefined conceptual topics
}

export default function QuizTopicSelector({ userId, onTopicSelected, predefinedTopics = [] }: QuizTopicSelectorProps) {
  const [selection, setSelection] = useState<QuizTopicSelection>({
    type: 'tractate',
    randomize: false
  });
  
  // Add a state for tracking the all tractates (not just learned ones)
  const [allTractates, setAllTractates] = useState<string[]>([]);
  const [learnedTractates, setLearnedTractates] = useState<string[]>([]);
  const [loadingTractates, setLoadingTractates] = useState(true);
  const [selectedTractate, setSelectedTractate] = useState<string | null>(null);
  const [dafimInTractate, setDafimInTractate] = useState<string[]>([]);
  const [loadingDafim, setLoadingDafim] = useState(false);
  const [topics, setTopics] = useState<string[]>(predefinedTopics);
  const [error, setError] = useState<string | null>(null);
  const [isExploringMode, setIsExploringMode] = useState(false);

  // Predefined list of all Talmudic tractates
  const bavliTractates = [
    "Berakhot", "Shabbat", "Eruvin", "Pesachim", "Rosh Hashanah", "Yoma", "Sukkah", 
    "Beitzah", "Taanit", "Megillah", "Moed Katan", "Chagigah", "Yevamot", "Ketubot", 
    "Nedarim", "Nazir", "Sotah", "Gittin", "Kiddushin", "Bava Kamma", "Bava Metzia", 
    "Bava Batra", "Sanhedrin", "Makkot", "Shevuot", "Avodah Zarah", "Horayot", 
    "Zevachim", "Menachot", "Chullin", "Bekhorot", "Arakhin", "Temurah", "Keritot", 
    "Meilah", "Tamid", "Niddah"
  ];

  // Fetch tractates the user has learned
  useEffect(() => {
    const fetchLearnedTractates = async () => {
      try {
        setLoadingTractates(true);
        
        // Set all tractates first
        setAllTractates(bavliTractates);
        
        // Get unique tractates from user_progress
        const { data, error } = await supabase
          .from('user_progress')
          .select('ref')
          .eq('user_id', userId)
          .eq('is_completed', true);
        
        if (error) throw error;
        
        // Extract tractate names from refs (e.g., "Berakhot.2a" -> "Berakhot")
        const tractateSet = new Set<string>();
        data.forEach(item => {
          const tractate = item.ref.split('.')[0];
          tractateSet.add(tractate);
        });
        
        setLearnedTractates(Array.from(tractateSet));
        setLoadingTractates(false);
      } catch (err) {
        console.error('Error fetching learned tractates:', err);
        setError('Failed to load your learned tractates');
        setLoadingTractates(false);
      }
    };
    
    fetchLearnedTractates();
  }, [userId]);

  // When a tractate is selected, fetch dafim within that tractate
  useEffect(() => {
    const fetchDafimInTractate = async () => {
      if (!selectedTractate) {
        setDafimInTractate([]);
        return;
      }
      
      try {
        setLoadingDafim(true);
        
        if (isExploringMode) {
          // Use a predefined list of standard dafim for exploration mode
          // Most tractates have amudim named 2a, 2b, 3a, 3b, etc.
          const dafim = [];
          for (let i = 2; i <= 20; i++) { // Include first 20 dafim for simplicity
            dafim.push(`${i}a`);
            dafim.push(`${i}b`);
          }
          setDafimInTractate(dafim);
          setLoadingDafim(false);
          return;
        }
        
        // Get unique dafim from user_progress for the selected tractate
        const { data, error } = await supabase
          .from('user_progress')
          .select('ref')
          .eq('user_id', userId)
          .eq('is_completed', true)
          .like('ref', `${selectedTractate}.%`);
        
        if (error) throw error;
        
        // Extract daf numbers from refs (e.g., "Berakhot.2a" -> "2a")
        const dafSet = new Set<string>();
        data.forEach(item => {
          const daf = item.ref.split('.')[1];
          dafSet.add(daf);
        });
        
        setDafimInTractate(Array.from(dafSet));
        setLoadingDafim(false);
      } catch (err) {
        console.error('Error fetching dafim:', err);
        setError('Failed to load dafim for this tractate');
        setLoadingDafim(false);
      }
    };
    
    fetchDafimInTractate();
  }, [selectedTractate, userId, isExploringMode]);

  // Handle selection type change
  const handleTypeChange = (type: QuizTopicSelection['type']) => {
    setSelection({ ...selection, type });
    
    // Reset other selections when changing type
    if (type !== 'tractate') setSelectedTractate(null);
    if (type === 'topic') {
      setSelection({ 
        type: 'topic',
        topic: topics[0] || '',
        randomize: selection.randomize
      });
    }
  };

  // Toggle exploration mode
  const toggleExplorationMode = () => {
    const newExploringMode = !isExploringMode;
    setIsExploringMode(newExploringMode);
    setSelection({
      ...selection,
      isExploring: newExploringMode
    });
    
    // Reset selections when toggling exploration mode
    setSelectedTractate(null);
  };

  // Handle tractate selection
  const handleTractateSelect = (tractate: string) => {
    setSelectedTractate(tractate);
    setSelection({
      ...selection,
      tractate,
      type: 'tractate',
      isExploring: isExploringMode
    });
  };

  // Handle daf selection
  const handleDafSelect = (daf: string) => {
    setSelection({
      ...selection,
      type: 'daf',
      tractate: selectedTractate || '',
      daf,
      isExploring: isExploringMode
    });
  };

  // Handle topic selection
  const handleTopicSelect = (topic: string) => {
    setSelection({
      ...selection,
      type: 'topic',
      topic,
      isExploring: isExploringMode
    });
  };

  // Handle randomize toggle
  const handleRandomizeToggle = () => {
    setSelection({
      ...selection,
      randomize: !selection.randomize
    });
  };

  // Generate a random selection based on current type
  const handleRandomSelection = () => {
    const tractatesList = isExploringMode ? allTractates : learnedTractates;
    
    if (selection.type === 'tractate' && tractatesList.length > 0) {
      // Select random tractate
      const randomTractate = tractatesList[Math.floor(Math.random() * tractatesList.length)];
      handleTractateSelect(randomTractate);
    } else if (selection.type === 'daf' && dafimInTractate.length > 0) {
      // Select random daf from current tractate
      const randomDaf = dafimInTractate[Math.floor(Math.random() * dafimInTractate.length)];
      handleDafSelect(randomDaf);
    } else if (selection.type === 'topic' && topics.length > 0) {
      // Select random topic
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      handleTopicSelect(randomTopic);
    }
  };

  // Submit the selection
  const handleSubmit = () => {
    onTopicSelected(selection);
  };

  // Render tractate items with improved styling
  const renderTractateItem = (tractate: string) => {
    const isLearned = learnedTractates.includes(tractate);
    
    return (
      <button
        key={tractate}
        onClick={() => handleTractateSelect(tractate)}
        className={`
          flex items-center justify-between px-4 py-3 mb-2 rounded-lg border transition-all duration-200
          ${selectedTractate === tractate 
            ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
            : isLearned || isExploringMode
              ? 'bg-gray-700/70 border-gray-600/70 text-gray-200 hover:bg-gray-600/80 hover:border-gray-500'
              : 'bg-gray-800/50 border-gray-700/50 text-gray-400 cursor-not-allowed opacity-60'
          }
        `}
        disabled={!isLearned && !isExploringMode}
      >
        <span className="font-medium">{tractate}</span>
        {isLearned && (
          <span className="text-xs py-0.5 px-2 bg-green-600/20 text-green-400 rounded-full border border-green-500/20">
            Learned
          </span>
        )}
      </button>
    );
  };

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

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/90 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700/50 hover:border-indigo-500/30 transition-colors">
      <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
        Select Quiz Topic
      </h2>
      
      {/* Selection Type Tabs */}
      <div className="flex space-x-2 mb-6">
        <button 
          onClick={() => handleTypeChange('tractate')}
          className={`flex-1 py-2 px-4 rounded-lg border transition-all duration-200 ${
            selection.type === 'tractate' 
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
              : 'bg-gray-700/70 border-gray-700 text-gray-300 hover:bg-gray-600/80'
          }`}
        >
          By Tractate
        </button>
        <button 
          onClick={() => handleTypeChange('daf')}
          className={`flex-1 py-2 px-4 rounded-lg border transition-all duration-200 ${
            selection.type === 'daf' 
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
              : 'bg-gray-700/70 border-gray-700 text-gray-300 hover:bg-gray-600/80'
          }`}
        >
          By Daf
        </button>
        {topics.length > 0 && (
          <button 
            onClick={() => handleTypeChange('topic')}
            className={`flex-1 py-2 px-4 rounded-lg border transition-all duration-200 ${
              selection.type === 'topic' 
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                : 'bg-gray-700/70 border-gray-700 text-gray-300 hover:bg-gray-600/80'
            }`}
          >
            By Topic
          </button>
        )}
      </div>
      
      {/* Exploration Mode Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg bg-gray-700/30 border border-gray-600/30 hover:bg-gray-700/50 transition-colors">
          <div className="relative">
            <input
              type="checkbox"
              checked={isExploringMode}
              onChange={toggleExplorationMode}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800 transition-colors"
            />
            {isExploringMode && (
              <span className="absolute inset-0 bg-indigo-500/10 rounded animate-ping-slow pointer-events-none"></span>
            )}
          </div>
          <div>
            <span className="text-gray-200 group-hover:text-white transition-colors font-medium">Exploration Mode</span>
            <p className="text-gray-300 text-sm mt-1">Access all tractates, even those you haven't learned yet</p>
          </div>
        </label>
      </div>
      
      {/* Randomize Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={selection.randomize}
              onChange={handleRandomizeToggle}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            {selection.randomize && (
              <span className="absolute inset-0 bg-indigo-500/10 rounded animate-ping-slow pointer-events-none"></span>
            )}
          </div>
          <span className="text-gray-300 group-hover:text-gray-200 transition-colors">
            Randomize Questions
          </span>
        </label>
      </div>
      
      {/* Random Selection Button */}
      <button
        onClick={handleRandomSelection}
        className="w-full mb-6 py-2.5 px-4 bg-gray-700/60 hover:bg-gray-600/70 rounded-lg text-gray-300 hover:text-gray-100 font-medium border-0 transition-all duration-200 hover:shadow-md"
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
          </svg>
          Pick Random Topic
        </span>
      </button>
      
      {/* Main content based on selection type */}
      {selection.type === 'tractate' && (
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">
            Select Tractate
          </label>
          {loadingTractates ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            </div>
          ) : (!isExploringMode && learnedTractates.length === 0) ? (
            <div className="text-gray-300 py-4 text-center">
              You haven't learned any tractates yet.
              {!isExploringMode && (
                <div className="mt-2">
                  <button 
                    onClick={toggleExplorationMode}
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Switch to exploration mode
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {(isExploringMode ? allTractates : learnedTractates).map((tractate) => renderTractateItem(tractate))}
            </div>
          )}
        </div>
      )}
      
      {/* Daf Selection */}
      {selection.type === 'daf' && (
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">
            Select Tractate
          </label>
          {loadingTractates ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            </div>
          ) : (
            <select
              value={selectedTractate || ''}
              onChange={(e) => setSelectedTractate(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-gray-300 rounded-lg p-2 w-full focus:ring-indigo-500 focus:border-indigo-500 mb-4"
            >
              <option value="">Select a tractate</option>
              {(isExploringMode ? allTractates : learnedTractates).map((tractate) => (
                <option key={tractate} value={tractate}>
                  {tractate}
                </option>
              ))}
            </select>
          )}
          
          {selectedTractate && (
            <>
              <label className="block text-gray-300 mb-2">
                Select Daf
              </label>
              {loadingDafim ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                </div>
              ) : dafimInTractate.length === 0 ? (
                <div className="text-gray-300 py-4 text-center">
                  {isExploringMode 
                    ? "No dafim available for this tractate."
                    : "You haven't learned any dafim in this tractate yet."
                  }
                  {!isExploringMode && (
                    <div className="mt-2">
                      <button 
                        onClick={toggleExplorationMode}
                        className="text-blue-400 hover:text-blue-300 underline"
                      >
                        Switch to exploration mode
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-60 overflow-y-auto">
                  {dafimInTractate.map((daf) => (
                    <button
                      key={daf}
                      className={`py-2 px-3 rounded-lg border ${
                        selection.daf === daf 
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300' 
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      }`}
                      onClick={() => handleDafSelect(daf)}
                    >
                      {daf}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Topic Selection */}
      {selection.type === 'topic' && (
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">
            Select Topic
          </label>
          {topics.length === 0 ? (
            <div className="text-gray-300 py-4 text-center">
              No topics available.
            </div>
          ) : (
            <select
              value={selection.topic || ''}
              onChange={(e) => handleTopicSelect(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-gray-300 rounded-lg p-2 w-full focus:ring-indigo-500 focus:border-indigo-500"
            >
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      
      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={
          (selection.type === 'tractate' && !selection.tractate) ||
          (selection.type === 'daf' && (!selection.tractate || !selection.daf)) ||
          (selection.type === 'topic' && !selection.topic)
        }
        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transform hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          Generate Quiz
        </span>
      </button>
    </div>
  );
} 