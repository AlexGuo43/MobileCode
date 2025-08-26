import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storage } from '../utils/storage';
import { 
  LanguageDefinition, 
  supportedLanguages, 
  pythonLanguage, 
  getLanguageByExtension,
  getLanguageByKey 
} from '../utils/languageDefinitions';

interface LanguageContextType {
  currentLanguage: LanguageDefinition;
  setLanguage: (language: LanguageDefinition) => void;
  setLanguageByKey: (key: string) => void;
  setLanguageByFileExtension: (filename: string) => void;
  supportedLanguages: LanguageDefinition[];
  isAutoDetectEnabled: boolean;
  setAutoDetectEnabled: (enabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageDefinition>(pythonLanguage);
  const [isAutoDetectEnabled, setAutoDetectEnabled] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguageKey = await storage.getItem('selectedLanguage');
      const savedAutoDetect = await storage.getItem('autoDetectLanguage');
      
      if (savedLanguageKey) {
        const language = getLanguageByKey(savedLanguageKey);
        setCurrentLanguage(language);
      }
      
      if (savedAutoDetect !== null) {
        setAutoDetectEnabled(savedAutoDetect === 'true');
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    }
  };

  const saveLanguagePreference = async (language: LanguageDefinition) => {
    try {
      await storage.setItem('selectedLanguage', language.key);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const saveAutoDetectPreference = async (enabled: boolean) => {
    try {
      await storage.setItem('autoDetectLanguage', enabled.toString());
    } catch (error) {
      console.error('Failed to save auto-detect preference:', error);
    }
  };

  const setLanguage = (language: LanguageDefinition) => {
    setCurrentLanguage(language);
    saveLanguagePreference(language);
  };

  const setLanguageByKey = (key: string) => {
    const language = getLanguageByKey(key);
    setLanguage(language);
  };

  const setLanguageByFileExtension = (filename: string) => {
    if (!isAutoDetectEnabled) {
      return; // Don't auto-detect if disabled
    }

    const extension = filename.split('.').pop() || '';
    const detectedLanguage = getLanguageByExtension(extension);
    
    // Only change if different from current language
    if (detectedLanguage.key !== currentLanguage.key) {
      setCurrentLanguage(detectedLanguage);
      // Don't save to preferences when auto-detecting
      // Only save when user manually selects
    }
  };

  const handleAutoDetectToggle = (enabled: boolean) => {
    setAutoDetectEnabled(enabled);
    saveAutoDetectPreference(enabled);
  };

  const contextValue: LanguageContextType = {
    currentLanguage,
    setLanguage,
    setLanguageByKey,
    setLanguageByFileExtension,
    supportedLanguages,
    isAutoDetectEnabled,
    setAutoDetectEnabled: handleAutoDetectToggle,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Helper hook to get current language snippets organized by category
export function useLanguageSnippets() {
  const { currentLanguage } = useLanguage();
  
  const getSnippetsForCategory = (category: keyof typeof currentLanguage.snippets) => {
    return currentLanguage.snippets[category] || [];
  };

  const getAllSnippetsAsTabs = () => {
    const tabs: Array<{
      key: string;
      label: string;
      data: Array<{id: string; label: string; text: string}>;
    }> = [];
    
    // Basic tab
    if (currentLanguage.snippets.basic?.length > 0) {
      tabs.push({
        key: 'basic',
        label: 'Basic',
        data: currentLanguage.snippets.basic,
      });
    }

    // Control Flow tab
    if (currentLanguage.snippets.controlFlow?.length > 0) {
      tabs.push({
        key: 'controlFlow',
        label: 'Control',
        data: currentLanguage.snippets.controlFlow,
      });
    }

    // Functions tab
    if (currentLanguage.snippets.functions?.length > 0) {
      tabs.push({
        key: 'functions',
        label: 'Functions',
        data: currentLanguage.snippets.functions,
      });
    }

    // Data Types tab
    if (currentLanguage.snippets.dataTypes?.length > 0) {
      tabs.push({
        key: 'dataTypes',
        label: 'Types',
        data: currentLanguage.snippets.dataTypes,
      });
    }

    // Collections tab (if available)
    if (currentLanguage.snippets.collections?.length > 0) {
      tabs.push({
        key: 'collections',
        label: 'Collections',
        data: currentLanguage.snippets.collections,
      });
    }

    return tabs;
  };

  return {
    currentLanguage,
    getSnippetsForCategory,
    getAllSnippetsAsTabs,
  };
}