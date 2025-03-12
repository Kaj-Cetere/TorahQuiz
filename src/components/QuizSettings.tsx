import { useState } from 'react';
import { QuizSettings, QuestionType } from '@/lib/types';

interface QuizSettingsProps {
  initialSettings?: Partial<QuizSettings>;
  onSave: (settings: QuizSettings) => void;
}

const DEFAULT_SETTINGS: QuizSettings = {
  questionCount: 10,
  difficulty: 'medium',
  questionTypes: [QuestionType.MultipleChoice, QuestionType.TrueFalse],
  includeExplanations: true,
  language: 'en'
};

export default function QuizSettingsComponent({ initialSettings, onSave }: QuizSettingsProps) {
  const [settings, setSettings] = useState<QuizSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  });

  const handleChange = (field: keyof QuizSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const handleQuestionTypeToggle = (type: QuestionType) => {
    const currentTypes = [...settings.questionTypes];
    
    if (currentTypes.includes(type)) {
      // Remove if already selected
      const updatedTypes = currentTypes.filter(t => t !== type);
      // Ensure at least one type is selected
      if (updatedTypes.length > 0) {
        handleChange('questionTypes', updatedTypes);
      }
    } else {
      // Add if not selected
      handleChange('questionTypes', [...currentTypes, type]);
    }
  };

  const saveSettings = () => {
    onSave(settings);
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/70 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700/50 hover:border-indigo-500/30 transition-colors">
      <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
        Quiz Settings
      </h2>
      
      {/* Question Count */}
      <div className="mb-6">
        <label htmlFor="questionCount" className="block text-gray-300 mb-2 font-medium">
          Number of Questions
        </label>
        <div className="flex items-center gap-4">
          <input 
            type="range" 
            id="questionCount" 
            min={5} 
            max={30} 
            step={5}
            value={settings.questionCount} 
            onChange={(e) => handleChange('questionCount', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-blue-300 font-medium w-10 text-center bg-indigo-500/10 rounded-md py-0.5 px-2 border border-indigo-500/20">
            {settings.questionCount}
          </span>
        </div>
      </div>
      
      {/* Difficulty */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-medium">
          Difficulty
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              className={`py-2 px-4 rounded-lg border shadow-sm transition-all duration-200 ${
                settings.difficulty === level 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                  : 'bg-gray-700/80 border-gray-600/80 text-gray-300 hover:bg-gray-600/90 hover:border-gray-500/80 hover:text-gray-200'
              }`}
              onClick={() => handleChange('difficulty', level)}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Question Types */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-medium">
          Question Types
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(QuestionType).map((type) => (
            <button
              key={type}
              className={`py-2 px-4 rounded-lg border text-left transition-all duration-200 ${
                settings.questionTypes.includes(type)
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                  : 'bg-gray-700/80 border-gray-600/80 text-gray-300 hover:bg-gray-600/90 hover:border-gray-500/80 hover:text-gray-200'
              }`}
              onClick={() => handleQuestionTypeToggle(type)}
            >
              {type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>
      
      {/* Include Explanations */}
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={settings.includeExplanations}
              onChange={(e) => handleChange('includeExplanations', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-800 transition-colors"
            />
            {settings.includeExplanations && (
              <span className="absolute inset-0 bg-indigo-500/10 rounded animate-ping-slow pointer-events-none"></span>
            )}
          </div>
          <span className="text-gray-300 group-hover:text-gray-200 transition-colors">Include Explanations with Answers</span>
        </label>
      </div>
      
      {/* Time Limit */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-medium">
          Time Limit (minutes, leave empty for no limit)
        </label>
        <input
          type="number"
          min={1}
          max={120}
          value={settings.timeLimit || ''}
          onChange={(e) => {
            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
            handleChange('timeLimit', value);
          }}
          className="bg-gray-700/80 border border-gray-600/80 text-gray-300 rounded-lg p-2 w-full focus:ring-indigo-500 focus:border-indigo-500 focus:shadow-[0_0_8px_rgba(99,102,241,0.3)] transition-all"
          placeholder="No time limit"
        />
      </div>
      
      {/* Language Preference */}
      <div className="mb-6">
        <label className="block text-gray-300 mb-2 font-medium">
          Language Preference
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['en', 'he', 'both'] as const).map((lang) => (
            <button
              key={lang}
              className={`py-2 px-4 rounded-lg border shadow-sm transition-all duration-200 ${
                settings.language === lang 
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-blue-300 shadow-[0_0_8px_rgba(99,102,241,0.3)]' 
                  : 'bg-gray-700/80 border-gray-600/80 text-gray-300 hover:bg-gray-600/90 hover:border-gray-500/80 hover:text-gray-200'
              }`}
              onClick={() => handleChange('language', lang)}
            >
              {lang === 'en' ? 'English' : lang === 'he' ? 'Hebrew' : 'Both'}
            </button>
          ))}
        </div>
      </div>
      
      {/* Save Button */}
      <button
        onClick={saveSettings}
        className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 rounded-lg text-white font-medium shadow-lg border border-indigo-500/30 transition-all duration-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Save Settings
        </span>
      </button>
    </div>
  );
} 