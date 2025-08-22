import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Settings, Zap, ZapOff } from 'lucide-react-native';
import { storage } from '../utils/storage';
import { KeyboardCustomizer, KeyboardTab, KeyboardButton } from './KeyboardCustomizer';
import { smartKeyboardService, TypingContext, SmartPrediction } from '../utils/smartKeyboard';

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

const defaultTabs: KeyboardTab[] = [
  {
    key: 'snippets',
    label: 'Snippets',
    data: [
      { id: '1', label: '=', text: '= ' },
      { id: '2', label: '+=', text: '+= ' },
      { id: '3', label: 'ans', text: 'ans ' },
      { id: '4', label: 'curr', text: 'curr ' },
      { id: '5', label: '0', text: '0 ' },
      { id: '6', label: "''", text: "''" },
      { id: '7', label: 'if', text: 'if condition:\n    ' },
      { id: '8', label: 'else', text: 'else:\n    ' },
      { id: '9', label: 'elif', text: 'elif condition:\n    ' },
      { id: '10', label: 'for', text: 'for ' },
      { id: '11', label: 'i', text: 'i ' },
      { id: '12', label: 'x', text: 'x ' },
      { id: '13', label: 'num', text: 'num ' },
      { id: '14', label: 'c', text: 'c ' },
      { id: '15', label: 'in', text: 'in ' },
      { id: '16', label: 'while', text: 'while condition:\n    ' },
      { id: '17', label: 'len', text: 'len(' },
      { id: '18', label: 'enumerate', text: 'enumerate(' },
      { id: '19', label: 'range', text: 'range(' },
      { id: '20', label: 'chr', text: 'chr(' },
      { id: '21', label: 'ord', text: 'ord(' },
      { id: '22', label: ')', text: ')' },
      { id: '23', label: 'int', text: 'int(' },
      { id: '24', label: 'set', text: 'set(' },
      { id: '25', label: 'str', text: 'str(' },
      { id: '26', label: 'float', text: 'float(' },
      { id: '27', label: 'list', text: 'list(' },
      { id: '28', label: 'dict', text: 'dict(' },
      { id: '29', label: 'print', text: 'print(' },
      { id: '30', label: 'input', text: 'input(' },
      { id: '31', label: 'def', text: 'def function():\n    ' },
      { id: '32', label: 'try', text: 'try:\n    \nexcept:\n    ' },
      { id: '33', label: 'class', text: 'class ClassName:\n    def __init__(self):\n        ' },
      { id: '34', label: 'import', text: 'import ' },
      { id: '35', label: 'from', text: 'from module import ' },
      { id: '36', label: 'var', text: 'var' },
      { id: '68', label: ':', text: ':' },
      { id: '69', label: '10', text: '10' },
      { id: '70', label: '1', text: '1' },
      { id: '71', label: 'arr', text: 'arr' },
      { id: '72', label: 'nums', text: 'nums' },
      { id: '73', label: 'list', text: 'list' },
    ],
  },
  {
    key: 'symbols',
    label: 'Symbols',
    data: [
      { id: '37', label: '()', text: '()' },
      { id: '38', label: '[]', text: '[]' },
      { id: '39', label: '{}', text: '{}' },
      { id: '40', label: '""', text: '""' },
      { id: '41', label: "''", text: "''" },
      { id: '42', label: ':', text: ':' },
      { id: '43', label: ';', text: ';' },
      { id: '44', label: '->', text: '->' },
      { id: '45', label: '=>', text: '=>' },
      { id: '46', label: '==', text: '==' },
      { id: '47', label: '!=', text: '!=' },
      { id: '48', label: '<=', text: '<=' },
      { id: '49', label: '>=', text: '>=' },
      { id: '50', label: '&&', text: '&&' },
      { id: '51', label: '||', text: '||' },
      { id: '52', label: '++', text: '++' },
      { id: '53', label: '--', text: '--' },
      { id: '54', label: '+=', text: '+=' },
      { id: '55', label: '-=', text: '-=' },
      { id: '56', label: '*=', text: '*=' },
    ],
  },
  {
    key: 'collections',
    label: 'Collections',
    data: [
      { id: '57', label: 'defaultdict', text: 'collections.defaultdict(' },
      { id: '58', label: 'Counter', text: 'collections.Counter(' },
      { id: '59', label: 'OrderedDict', text: 'collections.OrderedDict(' },
      { id: '60', label: 'deque', text: 'collections.deque(' },
      { id: '61', label: 'heappush', text: 'heapq.heappush(' },
      { id: '62', label: 'heappop', text: 'heapq.heappop(' },
      { id: '63', label: 'namedtuple', text: 'collections.namedtuple(' },
    ],
  },
];

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
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState<KeyboardTab[]>(defaultTabs);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [smartMode, setSmartMode] = useState(true);
  const [smartPredictions, setSmartPredictions] = useState<SmartPrediction[]>([]);

  useEffect(() => {
    loadCustomTabs();
    initializeSmartKeyboard();
  }, []);

  useEffect(() => {
    if (smartMode) {
      updateSmartPredictions();
    }
  }, [smartMode, currentText, cursorPosition, activeTab]);

  const loadCustomTabs = async () => {
    try {
      const savedTabs = await storage.getItem('customKeyboardTabs');
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs);
        // Migrate old 'var = ' to new 'var' format
        const migratedTabs = parsedTabs.map((tab: KeyboardTab) => ({
          ...tab,
          data: tab.data.map((button: KeyboardButton) => {
            if (button.id === '36' && button.label === 'var' && button.text === 'var = ') {
              return { ...button, text: 'var' };
            }
            return button;
          })
        }));
        setTabs(migratedTabs);
        // Save the migrated version
        await storage.setItem('customKeyboardTabs', JSON.stringify(migratedTabs));
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
    const predictions = smartKeyboardService.getSmartPredictions(tabs, context, 6);
    setSmartPredictions(predictions);
  };

  const handleSmartInsert = async (button: KeyboardButton) => {
    const context = getTypingContext();
    await smartKeyboardService.recordButtonUsage(button, context);
    const smartText = smartKeyboardService.getSmartButtonText(button, context);
    onInsert(smartText);
  };

  const handleCustomizerSave = (newTabs: KeyboardTab[]) => {
    setTabs(newTabs);
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
        initialTabs={defaultTabs}
      />
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