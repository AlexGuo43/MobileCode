import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import { Settings, Zap, ZapOff, Globe } from 'lucide-react-native';
import { storage } from '../utils/storage';
import { KeyboardCustomizer, KeyboardTab, KeyboardButton } from './KeyboardCustomizer';
import { smartKeyboardService, TypingContext, SmartPrediction } from '../utils/smartKeyboard';
import { useLanguageSnippets, useLanguage } from '../contexts/LanguageContext';

interface CodeKeyboardProps {
  onInsert: (text: string) => void;
  onDeindent?: () => void;
  onDeleteLine?: () => void;
  onMoveUpLine?: () => void;
  onMoveDownLine?: () => void;
  onMoveLeftLine?: () => void;
  onMoveRightLine?: () => void;
  currentText?: string;
  cursorPosition?: number;
}


export function CodeKeyboard({
  onInsert,
  onDeindent,
  onDeleteLine,
  onMoveUpLine,
  onMoveDownLine,
  onMoveLeftLine,
  onMoveRightLine,
  currentText = '',
  cursorPosition = 0,
}: CodeKeyboardProps) {
  const { getAllSnippetsAsTabs, currentLanguage } = useLanguageSnippets();
  const { supportedLanguages, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState<KeyboardTab[]>([]);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [smartMode, setSmartMode] = useState(true);
  const [smartPredictions, setSmartPredictions] = useState<SmartPrediction[]>([]);

  useEffect(() => {
    loadLanguageBasedTabs();
    initializeSmartKeyboard();
  }, [currentLanguage]);

  useEffect(() => {
    if (tabs.length > 0) {
      loadCustomTabs();
    }
  }, [tabs.length]);

  useEffect(() => {
    if (smartMode) {
      updateSmartPredictions();
    }
  }, [smartMode, currentText, cursorPosition, activeTab]);

  const loadLanguageBasedTabs = () => {
    // Get tabs for current language
    const languageTabs = getAllSnippetsAsTabs();
    setTabs(languageTabs);
    setActiveTab(0); // Reset to first tab when language changes
  };

  const loadCustomTabs = async () => {
    try {
      // Load custom tabs specific to current language
      const storageKey = `customKeyboardTabs_${currentLanguage.key}`;
      const savedTabs = await storage.getItem(storageKey);
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        // Apply any migration logic if needed
        const migratedTabs = parsedTabs.map((tab: KeyboardTab) => ({
          ...tab,
          data: tab.data.map((button: KeyboardButton) => {
            // Legacy migration for Python
            if (currentLanguage.key === 'python' && button.id === '36' && button.label === 'var' && button.text === 'var = ') {
              return { ...button, text: 'var' };
            }
            return button;
          })
        }));
        setTabs(migratedTabs);
        // Save the migrated version
        await storage.setItem(storageKey, JSON.stringify(migratedTabs));
      }
    } catch (error) {
      console.error('Failed to load custom keyboard tabs:', error);
    }
  };

  const initializeSmartKeyboard = async () => {
    await smartKeyboardService.initialize();
  };

  const getTypingContext = (): TypingContext => {
    const lines = currentText.split('\n');
    const currentLineIndex = currentText.substring(0, cursorPosition).split('\n').length - 1;
    const currentLine = lines[currentLineIndex] || '';
    const beforeCursor = currentText.substring(0, cursorPosition);
    
    // Get text from start of current line to cursor
    const lineBeforeCursor = beforeCursor.split('\n').pop() || '';
    // Split by non-word characters but keep meaningful punctuation
    const words = lineBeforeCursor.split(/[\s\(\)\[\]\{\},;]+/).filter(w => w.length > 0);
    const lastWord = words[words.length - 1] || '';
    
    return {
      lastWord,
      currentLine,
      isNewLine: currentLine.trim() === '',
      lineIndentation: currentLine.length - currentLine.trimStart().length,
    };
  };

  const updateSmartPredictions = () => {
    const context = getTypingContext();
    const predictions = smartKeyboardService.getSmartPredictions(tabs, context, currentLanguage, 6);
    setSmartPredictions(predictions);
  };

  const handleSmartInsert = async (button: KeyboardButton) => {
    const context = getTypingContext();
    await smartKeyboardService.recordButtonUsage(button, context);
    const smartText = smartKeyboardService.getSmartButtonText(button, context, currentLanguage);
    onInsert(smartText);
  };

  const handleCustomizerSave = async (newTabs: KeyboardTab[]) => {
    setTabs(newTabs);
    // Save custom tabs for current language
    try {
      const storageKey = `customKeyboardTabs_${currentLanguage.key}`;
      await storage.setItem(storageKey, JSON.stringify(newTabs));
    } catch (error) {
      console.error('Failed to save custom keyboard tabs:', error);
    }
  };

  const currentData = tabs[activeTab]?.data || [];
  const halfIndex = Math.ceil(currentData.length / 2);
  const firstRow = currentData.slice(0, halfIndex);
  const secondRow = currentData.slice(halfIndex);

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContent}
      >
        <TouchableOpacity
          style={styles.languageButton}
          onPress={() => setShowLanguageSelector(true)}
        >
          <Globe size={14} color="#007AFF" />
          <Text style={styles.languageButtonText}>{currentLanguage.key.toUpperCase()}</Text>
        </TouchableOpacity>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === index && styles.activeTab,
            ]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[
              styles.tabText,
              activeTab === index && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.customizeButton}
          onPress={() => setSmartMode(!smartMode)}
        >
          {smartMode ? (
            <Zap size={16} color="#007AFF" />
          ) : (
            <ZapOff size={16} color="#8E8E93" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.customizeButton}
          onPress={() => setShowCustomizer(true)}
        >
          <Settings size={16} color="#007AFF" />
        </TouchableOpacity>
      </ScrollView>

      {/* Smart Row */}
      {smartMode && smartPredictions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.smartRow}
          contentContainerStyle={styles.keyboardContent}
        >
          {smartPredictions.map((prediction) => (
            <TouchableOpacity
              key={`smart-${prediction.button.id}`}
              style={[styles.keyButton, styles.smartButton]}
              onPress={() => handleSmartInsert(prediction.button)}
            >
              <Text style={styles.keyText}>{prediction.button.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Keyboard Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.keyboardRow, styles.firstRow]}
        contentContainerStyle={styles.keyboardContent}
      >
        {firstRow.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.keyButton}
            onPress={() => smartMode ? handleSmartInsert(item) : onInsert(item.text)}
          >
            <Text style={styles.keyText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.keyboardRow, styles.secondRow]}
        contentContainerStyle={styles.keyboardContent}
      >
        {secondRow.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.keyButton}
            onPress={() => smartMode ? handleSmartInsert(item) : onInsert(item.text)}
          >
            <Text style={styles.keyText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation Keys */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.navigationRow}
        contentContainerStyle={styles.navigationContent}
      >
        <TouchableOpacity style={styles.navButton} onPress={onMoveLeftLine}>
          <Text style={styles.navText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onMoveRightLine}>
          <Text style={styles.navText}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onMoveUpLine}>
          <Text style={styles.navText}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onMoveDownLine}>
          <Text style={styles.navText}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => onInsert('\n')}>
          <Text style={styles.navText}>↵</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => onInsert('    ')}>
          <Text style={styles.navText}>Tab</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onDeindent}>
          <Text style={styles.navText}>⇤</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onDeleteLine}>
          <Text style={styles.navText}>Del</Text>
        </TouchableOpacity>
      </ScrollView>

      <KeyboardCustomizer
        isVisible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        onSave={handleCustomizerSave}
        initialTabs={getAllSnippetsAsTabs()}
      />

      {/* Language Selector Modal */}
      <Modal
        visible={showLanguageSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <Text style={styles.languageModalTitle}>Select Language</Text>
            <ScrollView style={styles.languageList}>
              {supportedLanguages.map((language) => (
                <TouchableOpacity
                  key={language.key}
                  style={[
                    styles.languageItem,
                    currentLanguage.key === language.key && styles.selectedLanguageItem,
                  ]}
                  onPress={() => {
                    setLanguage(language);
                    setShowLanguageSelector(false);
                  }}
                >
                  <Text
                    style={[
                      styles.languageItemText,
                      currentLanguage.key === language.key && styles.selectedLanguageItemText,
                    ]}
                  >
                    {language.name}
                  </Text>
                  {currentLanguage.key === language.key && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLanguageSelector(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2C2C2E',
    borderTopWidth: 1,
    borderTopColor: '#3C3C3E',
  },
  tabContainer: {
    backgroundColor: '#1C1C1E',
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  customizeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3C3C3E',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#3C3C3E',
    gap: 4,
  },
  languageButtonText: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'FiraCode-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  languageModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  languageList: {
    maxHeight: 200,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedLanguageItem: {
    backgroundColor: '#007AFF',
  },
  languageItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  selectedLanguageItemText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkmark: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#3C3C3E',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  keyboardRow: {
    paddingVertical: 12,
  },
  firstRow: {
    paddingBottom: 6,
  },
  secondRow: {
    paddingTop: 6,
  },
  keyboardContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  keyButton: {
    backgroundColor: '#3C3C3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
  },
  navigationRow: {
    paddingBottom: 12,
  },
  navigationContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  navButton: {
    backgroundColor: '#3C3C3E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  navText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
  },
  smartRow: {
    paddingBottom: 8,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  smartButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'column',
    paddingVertical: 6,
  },
  smartScore: {
    fontSize: 8,
    marginTop: 2,
  },
});