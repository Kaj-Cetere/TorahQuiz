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
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
      <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
        Select Quiz Topic
      </h2>
      
      {/* Exploration Mode Toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isExploringMode}
            onChange={toggleExplorationMode}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
          />
          <span className="text-gray-300">
            Explore and test on material I haven't marked as learned
            {isExploringMode && (
              <span className="ml-2 text-yellow-400 text-xs">
                (Note: This won't mark content as learned)
              </span>
            )}
          </span>
        </label>
      </div>
      
      {/* Selection Type */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2">
          What would you like to be tested on?
        </label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['tractate', 'daf', 'topic'] as const).map((type) => (
            <button
              key={type}
              className={`py-2 px-4 rounded-lg border ${
                selection.type === type 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300' 
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => handleTypeChange(type)}
            >
              {type === 'tractate' ? 'Entire Tractate' : 
               type === 'daf' ? 'Specific Daf/Amud' : 
               'Conceptual Topic'}
            </button>
          ))}
        </div>
        
        {/* Random Selection Button */}
        <button
          onClick={handleRandomSelection}
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 border border-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 13l-7 7-7-7m14-8l-7 7-7-7"></path>
          </svg>
          Random Selection
        </button>
      </div>
      
      {/* Tractate Selection */}
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
            <div className="text-gray-400 py-4 text-center">
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
              {(isExploringMode ? allTractates : learnedTractates).map((tractate) => (
                <button
                  key={tractate}
                  className={`py-2 px-4 rounded-lg border ${
                    selection.tractate === tractate 
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300' 
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                  onClick={() => handleTractateSelect(tractate)}
                >
                  {tractate}
                </button>
              ))}
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
                <div className="text-gray-400 py-4 text-center">
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
            <div className="text-gray-400 py-4 text-center">
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
      
      {/* Randomize toggle */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selection.randomize}
            onChange={handleRandomizeToggle}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
          />
          <span className="text-gray-300">Randomize questions within selected content</span>
        </label>
      </div>
      
      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={
          (selection.type === 'tractate' && !selection.tractate) ||
          (selection.type === 'daf' && (!selection.tractate || !selection.daf)) ||
          (selection.type === 'topic' && !selection.topic)
        }
        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Generate Quiz
      </button>
    </div>
  );
} 