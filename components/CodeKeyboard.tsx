import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Settings } from 'lucide-react-native';
import { storage } from '../utils/storage';
import { KeyboardCustomizer, KeyboardTab, KeyboardButton } from './KeyboardCustomizer';

interface CodeKeyboardProps {
  onInsert: (text: string) => void;
  onDeindent?: () => void;
  onDeleteLine?: () => void;
  onMoveUpLine?: () => void;
  onMoveDownLine?: () => void;
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
    ],
  },
  {
    key: 'symbols',
    label: 'Symbols',
    data: [
      { id: '36', label: '()', text: '()' },
      { id: '37', label: '[]', text: '[]' },
      { id: '38', label: '{}', text: '{}' },
      { id: '39', label: '""', text: '""' },
      { id: '40', label: "''", text: "''" },
      { id: '41', label: ':', text: ':' },
      { id: '42', label: ';', text: ';' },
      { id: '43', label: '->', text: '->' },
      { id: '44', label: '=>', text: '=>' },
      { id: '45', label: '==', text: '==' },
      { id: '46', label: '!=', text: '!=' },
      { id: '47', label: '<=', text: '<=' },
      { id: '48', label: '>=', text: '>=' },
      { id: '49', label: '&&', text: '&&' },
      { id: '50', label: '||', text: '||' },
      { id: '51', label: '++', text: '++' },
      { id: '52', label: '--', text: '--' },
      { id: '53', label: '+=', text: '+=' },
      { id: '54', label: '-=', text: '-=' },
      { id: '55', label: '*=', text: '*=' },
    ],
  },
  {
    key: 'collections',
    label: 'Collections',
    data: [
      { id: '56', label: 'defaultdict', text: 'collections.defaultdict(' },
      { id: '57', label: 'Counter', text: 'collections.Counter(' },
      { id: '58', label: 'OrderedDict', text: 'collections.OrderedDict(' },
      { id: '59', label: 'deque', text: 'collections.deque(' },
      { id: '60', label: 'heappush', text: 'heapq.heappush(' },
      { id: '61', label: 'heappop', text: 'heapq.heappop(' },
      { id: '62', label: 'namedtuple', text: 'collections.namedtuple(' },
    ],
  },
];

export function CodeKeyboard({
  onInsert,
  onDeindent,
  onDeleteLine,
  onMoveUpLine,
  onMoveDownLine,
}: CodeKeyboardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState<KeyboardTab[]>(defaultTabs);
  const [showCustomizer, setShowCustomizer] = useState(false);

  useEffect(() => {
    loadCustomTabs();
  }, []);

  const loadCustomTabs = async () => {
    try {
      const savedTabs = await storage.getItem('customKeyboardTabs');
      if (savedTabs) {
        setTabs(JSON.parse(savedTabs));
      }
    } catch (error) {
      console.error('Failed to load custom keyboard tabs:', error);
    }
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
      <View style={styles.tabContainer}>
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
          onPress={() => setShowCustomizer(true)}
        >
          <Settings size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Keyboard Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.keyboardRow, styles.firstRow]}
        contentContainerStyle={styles.keyboardContent}
      >
        {firstRow.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.keyButton}
            onPress={() => onInsert(item.text)}
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
        {secondRow.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            style={styles.keyButton}
            onPress={() => onInsert(item.text)}
          >
            <Text style={styles.keyText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Navigation Keys */}
      <View style={styles.navigationRow}>
        <TouchableOpacity style={styles.navButton} onPress={() => onInsert('    ')}>
          <Text style={styles.navText}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onDeindent}>
          <Text style={styles.navText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={onDeleteLine}>
          <Text style={styles.navText}>Del</Text>
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
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
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
    marginLeft: 8,
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
});