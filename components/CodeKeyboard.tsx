import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface CodeKeyboardProps {
  onInsert: (text: string) => void;
  onDeindent?: () => void;
  onDeleteLine?: () => void;
  onMoveUpLine?: () => void;
  onMoveDownLine?: () => void;
}

const pythonSnippets = [
  { label: '=', text: '= ' },
  { label: '+=', text: '+= ' },
  { label: 'ans', text: 'ans ' },
  { label: 'curr', text: 'curr ' },
  { label: '0', text: '0 ' },
  { label: '\'\'', text: '\'\'' },
  { label: 'if', text: 'if condition:\n    ' },
  { label: 'else', text: 'else:\n    ' },
  { label: 'elif', text: 'elif condition:\n    ' },
  { label: 'for', text: 'for ' },
  { label: 'i', text: 'i ' },
  { label: 'x', text: 'x ' },
  { label: 'num', text: 'num ' },
  { label: 'c', text: 'c ' },
  { label: 'in', text: 'in ' },
  { label: 'while', text: 'while condition:\n    ' },
  { label: 'len', text: 'len(' },
  { label: 'enumerate', text: 'enumerate(' },
  { label: 'range', text: 'range(' },
  { label: 'chr', text: 'chr(' },
  { label: 'ord', text: 'ord(' },
  { label: ')', text: ')' },
  { label: 'int', text: 'int(' },
  { label: 'set', text: 'set(' },
  { label: 'str', text: 'str(' },
  { label: 'float', text: 'float(' },
  { label: 'list', text: 'list(' },
  { label: 'dict', text: 'dict(' },
  { label: 'print', text: 'print(' },
  { label: 'input', text: 'input(' },
  { label: 'def', text: 'def function():\n    ' },
  { label: 'try', text: 'try:\n    \nexcept:\n    ' },
  { label: 'class', text: 'class ClassName:\n    def __init__(self):\n        ' },
  { label: 'import', text: 'import ' },
  { label: 'from', text: 'from module import ' },
];

const symbols = [
  { label: '()', text: '()' },
  { label: '[]', text: '[]' },
  { label: '{}', text: '{}' },
  { label: '""', text: '""' },
  { label: "''", text: "''" },
  { label: ':', text: ':' },
  { label: ';', text: ';' },
  { label: '->', text: '->' },
  { label: '=>', text: '=>' },
  { label: '==', text: '==' },
  { label: '!=', text: '!=' },
  { label: '<=', text: '<=' },
  { label: '>=', text: '>=' },
  { label: '&&', text: '&&' },
  { label: '||', text: '||' },
  { label: '++', text: '++' },
  { label: '--', text: '--' },
  { label: '+=', text: '+=' },
  { label: '-=', text: '-=' },
  { label: '*=', text: '*=' },
];

const collections = [
  { label: 'defaultdict', text: 'collections.defaultdict(' },
  { label: 'Counter', text: 'collections.Counter(' },
  { label: 'OrderedDict', text: 'collections.OrderedDict(' },
  { label: 'deque', text: 'collections.deque(' },
  { label: 'namedtuple', text: 'collections.namedtuple(' },
];

export function CodeKeyboard({
  onInsert,
  onDeindent,
  onDeleteLine,
  onMoveUpLine,
  onMoveDownLine,
}: CodeKeyboardProps) {
  const [activeTab, setActiveTab] = useState<'snippets' | 'symbols' | 'collections'>('snippets');

  const tabs = [
    { key: 'snippets', label: 'Snippets', data: pythonSnippets },
    { key: 'symbols', label: 'Symbols', data: symbols },
    { key: 'collections', label: 'Collections', data: collections },
  ];

  const currentData = tabs.find(tab => tab.key === activeTab)?.data || [];

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Keyboard Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.keyboardRow}
        contentContainerStyle={styles.keyboardContent}
      >
        {currentData.map((item, index) => (
          <TouchableOpacity
            key={index}
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
  keyboardRow: {
    paddingVertical: 12,
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