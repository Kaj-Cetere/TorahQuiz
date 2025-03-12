import { useState, useEffect, useRef } from 'react';
import { QuizTopicSelection } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';

interface QuizGenerationPopupProps {
  userId: string;
  onGenerateQuiz: (selection: QuizTopicSelection) => void;
  onCancel: () => void;
}

// Custom dropdown component to avoid browser styling issues
function CustomDropdown({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[], 
  value: string, 
  onChange: (value: string) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-gray-700/50 border-0 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] text-gray-200 rounded-lg p-3 pl-4 pr-3 focus:ring-indigo-500 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.5)] focus:outline-none hover:bg-gray-700/80 transition-colors cursor-pointer text-left"
      >
        <span>{value}</span>
        <div className="bg-indigo-500/10 rounded-full p-1 shadow-[0_0_0_1px_rgba(99,102,241,0.3)] text-indigo-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 15l-7-7-7 7"></path>
          </svg>
        </div>
      </button>
      
      {/* Dropdown options - now positioned above the button */}
      {isOpen && (
        <div className="absolute z-20 bottom-full mb-1 w-full bg-gray-800 rounded-lg border-0 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] shadow-lg max-h-48 overflow-y-auto">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors ${
                  option === value ? 'bg-indigo-500/10 text-indigo-300' : 'text-gray-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizGenerationPopup({ 
  userId, 
  onGenerateQuiz, 
  onCancel 
}: QuizGenerationPopupProps) {
  // Selection type options: specific masechta, all learned material, or by topic
  type SelectionType = 'specific-masechta' | 'all-learned' | 'by-topic';
  
  const [selectionType, setSelectionType] = useState<SelectionType>('specific-masechta');
  const [selectedMasechta, setSelectedMasechta] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [learnedMasechtot, setLearnedMasechtot] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExploringMode, setIsExploringMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Predefined list of all Talmudic tractates
  const bavliTractates = [
    "Berakhot", "Shabbat", "Eruvin", "Pesachim", "Rosh Hashanah", "Yoma", "Sukkah", 
    "Beitzah", "Taanit", "Megillah", "Moed Katan", "Chagigah", "Yevamot", "Ketubot", 
    "Nedarim", "Nazir", "Sotah", "Gittin", "Kiddushin", "Bava Kamma", "Bava Metzia", 
    "Bava Batra", "Sanhedrin", "Makkot", "Shevuot", "Avodah Zarah", "Horayot", 
    "Zevachim", "Menachot", "Chullin", "Bekhorot", "Arakhin", "Temurah", "Keritot", 
    "Meilah", "Tamid", "Niddah"
  ];

  // Sample topics (these could come from props or be hardcoded)
  const sampleTopics = [
    'Prayer Laws',
    'Shabbat Prohibitions',
    'Business Ethics',
    'Marriage and Divorce',
    'Agricultural Laws',
    'Ritual Purity',
    'Holiday Observance',
    'Court Procedures',
    'Temple Service',
    'Damages and Compensation'
  ];

  // Custom dropdown style to ensure consistent appearance
  const selectWrapperStyle = {
    position: 'relative' as const,
    width: '100%',
  };

  const selectStyle = {
    appearance: 'none' as const,
    backgroundColor: 'rgba(55, 65, 81, 0.5)',
    color: 'rgb(229, 231, 235)',
    borderRadius: '0.5rem',
    padding: '0.75rem',
    paddingLeft: '1rem',
    paddingRight: '2.5rem',
    width: '100%',
    outline: 'none',
    border: 'none',
    boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  };

  const selectIconWrapperStyle = {
    position: 'absolute' as const,
    right: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
    color: 'rgb(129, 140, 248)',
  };

  const selectIconStyle = {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '9999px',
    padding: '0.25rem',
    boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.3)',
  };

  // Fetch tractates the user has learned
  useEffect(() => {
    const fetchLearnedTractates = async () => {
      try {
        setIsLoading(true);
        
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
        
        setLearnedMasechtot(Array.from(tractateSet));
        
        // Select the first tractate by default if available
        if (tractateSet.size > 0) {
          setSelectedMasechta(Array.from(tractateSet)[0]);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching learned tractates:', err);
        setError('Failed to load your learned tractates');
        setIsLoading(false);
      }
    };
    
    fetchLearnedTractates();
  }, [userId]);

  // Toggle exploration mode
  const toggleExplorationMode = () => {
    setIsExploringMode(!isExploringMode);
  };

  // Handle quiz generation
  const handleGenerateQuiz = () => {
    let selection: QuizTopicSelection;
    
    if (selectionType === 'specific-masechta' && selectedMasechta) {
      // Quiz on specific masechta (random 5 amudim)
      selection = {
        type: 'tractate',
        tractate: selectedMasechta,
        randomize: true,
        isExploring: isExploringMode
      };
    } else if (selectionType === 'all-learned') {
      // Quiz on random 5 amudim from all learned material
      selection = {
        type: 'tractate',
        randomize: true,
        isExploring: isExploringMode
      };
    } else {
      // Quiz on specific topic
      selection = {
        type: 'topic',
        topic: customTopic || sampleTopics[0],
        randomize: true,
        isExploring: isExploringMode
      };
    }
    
    onGenerateQuiz(selection);
  };

  // Get random topic
  const getRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * sampleTopics.length);
    setCustomTopic(sampleTopics[randomIndex]);
  };

  // List of tractates to display based on exploration mode
  const tractateList = isExploringMode ? bavliTractates : learnedMasechtot;

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4 animate-fadeIn">
        <div className="bg-gray-800 rounded-xl shadow-xl border-0 shadow-[0_0_0_1px_rgba(75,85,99,0.2)] p-6 max-w-md w-full">
          <div className="flex items-center text-red-400 mb-4">
            <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="font-medium">Error</h3>
          </div>
          <p className="text-red-300 mb-4">{error}</p>
          <button 
            onClick={onCancel}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all border-0 shadow-[0_0_0_1px_rgba(75,85,99,0.2)]"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-8 animate-fadeIn overflow-hidden">
      <div className="bg-gray-800 rounded-xl shadow-2xl border-0 shadow-[0_0_0_1px_rgba(59,130,246,0.15)] p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 right-0 flex justify-between items-center mb-4 bg-gray-800 py-2 z-10">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            Generate Quiz
          </h2>
          
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Divider with icon */}
        <div className="flex items-center mb-4">
          <div className="flex-grow h-px bg-gray-700/50"></div>
          <div className="mx-4 p-1 bg-blue-500/10 rounded-full">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
          </div>
          <div className="flex-grow h-px bg-gray-700/50"></div>
        </div>

        {/* Exploration Mode Toggle */}
        <div className="mb-6 bg-gray-700/30 p-3 rounded-lg border-0 shadow-[0_0_0_1px_rgba(75,85,99,0.2)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isExploringMode}
              onChange={toggleExplorationMode}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            <div>
              <span className="text-gray-300 block">
                Include material I haven't marked as learned
              </span>
              {isExploringMode && (
                <span className="text-yellow-400 text-xs block mt-1">
                  Exploration mode: Test yourself on new material
                </span>
              )}
            </div>
          </label>
        </div>

        {/* Selection Type Options */}
        <div className="mb-6 space-y-3">
          <h3 className="text-blue-300 text-lg font-medium mb-2">What would you like to be tested on?</h3>
          
          <label className={`flex items-start p-3 rounded-lg ${selectionType === 'specific-masechta' ? 'bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]' : 'bg-gray-700/30 hover:bg-gray-700/40 shadow-[0_0_0_1px_rgba(75,85,99,0.2)]'} cursor-pointer transition-all border-0`}>
            <input
              type="radio"
              id="specific-masechta"
              name="selection-type"
              checked={selectionType === 'specific-masechta'}
              onChange={() => setSelectionType('specific-masechta')}
              className="w-4 h-4 mt-1 text-indigo-500 border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            <div className="ml-3">
              <span className="text-gray-200 font-medium block">Specific Masechta</span>
              <span className="text-gray-400 text-sm">Test on a specific tractate</span>
            </div>
          </label>

          <label className={`flex items-start p-3 rounded-lg ${selectionType === 'all-learned' ? 'bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]' : 'bg-gray-700/30 hover:bg-gray-700/40 shadow-[0_0_0_1px_rgba(75,85,99,0.2)]'} cursor-pointer transition-all border-0`}>
            <input
              type="radio"
              id="all-learned"
              name="selection-type"
              checked={selectionType === 'all-learned'}
              onChange={() => setSelectionType('all-learned')}
              className="w-4 h-4 mt-1 text-indigo-500 border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            <div className="ml-3">
              <span className="text-gray-200 font-medium block">All Material</span>
              <span className="text-gray-400 text-sm">Test on everything you've learned</span>
            </div>
          </label>

          <label className={`flex items-start p-3 rounded-lg ${selectionType === 'by-topic' ? 'bg-indigo-500/10 shadow-[0_0_0_1px_rgba(99,102,241,0.4)]' : 'bg-gray-700/30 hover:bg-gray-700/40 shadow-[0_0_0_1px_rgba(75,85,99,0.2)]'} cursor-pointer transition-all border-0`}>
            <input
              type="radio"
              id="by-topic"
              name="selection-type"
              checked={selectionType === 'by-topic'}
              onChange={() => setSelectionType('by-topic')}
              className="w-4 h-4 mt-1 text-indigo-500 border-gray-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
            />
            <div className="ml-3">
              <span className="text-gray-200 font-medium block">Specific Topic</span>
              <span className="text-gray-400 text-sm">Test on a specific topic across your learning</span>
            </div>
          </label>
        </div>

        {/* Masechta Selector (visible when specific-masechta is selected) */}
        {selectionType === 'specific-masechta' && (
          <div className={`mb-6 transition-opacity duration-300 ${selectionType === 'specific-masechta' ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-blue-300 font-medium mb-2">Select Masechta</h3>
            {isLoading ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              tractateList.length === 0 ? (
                <div className="text-amber-400 py-4 text-center bg-amber-900/20 rounded-lg border-0 shadow-[0_0_0_1px_rgba(217,119,6,0.2)]">
                  {isExploringMode 
                    ? "No masechtot available."
                    : "You haven't learned any masechtot yet."
                  }
                </div>
              ) : (
                <div className="relative">
                  {/* Custom dropdown implementation */}
                  <CustomDropdown 
                    options={tractateList}
                    value={selectedMasechta || ''}
                    onChange={setSelectedMasechta}
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* Topic Selector (visible when by-topic is selected) */}
        {selectionType === 'by-topic' && (
          <div className={`mb-6 transition-opacity duration-300 ${selectionType === 'by-topic' ? 'opacity-100' : 'opacity-0'}`}>
            <h3 className="text-blue-300 font-medium mb-2">Enter Topic</h3>
            <div className="relative">
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Enter a topic (e.g., Prayer Laws, Shabbat)"
                className="bg-gray-700/50 border-0 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] text-gray-200 rounded-lg pl-10 pr-12 p-3 w-full focus:ring-indigo-500 focus:shadow-[0_0_0_1px_rgba(99,102,241,0.5)] focus:outline-none hover:bg-gray-700/80 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <button 
                onClick={getRandomTopic}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-400 transition-colors"
                title="Get random topic"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                  <circle cx="8" cy="6" r="1" fill="currentColor"></circle>
                  <circle cx="15" cy="12" r="1" fill="currentColor"></circle>
                  <circle cx="10" cy="18" r="1" fill="currentColor"></circle>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="sticky bottom-0 mt-6 pt-4 flex gap-3 bg-gradient-to-t from-gray-800 via-gray-800 to-transparent">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors border-0 shadow-[0_0_0_1px_rgba(75,85,99,0.3)]"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateQuiz}
            disabled={
              isLoading || 
              (selectionType === 'specific-masechta' && !selectedMasechta) ||
              (selectionType === 'by-topic' && !customTopic)
            }
            className="flex-grow py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center border-0 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
            Generate Quiz
          </button>
        </div>
      </div>
    </div>
  );
} 