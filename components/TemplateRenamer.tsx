import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { templateService, TemplateMatch } from '../utils/templateSystem';

interface TemplateRenamerProps {
  visible: boolean;
  template: TemplateMatch | null;
  onClose: () => void;
  onConfirm: (newValue: string) => void;
}

export function TemplateRenamer({ 
  visible, 
  template, 
  onClose, 
  onConfirm 
}: TemplateRenamerProps) {
  const [currentValue, setCurrentValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (template) {
      setCurrentValue(''); // Start with empty field
      const templateSuggestions = templateService.getSuggestionsForType(template.type);
      setSuggestions(templateSuggestions);
    }
  }, [template]);

  const handleConfirm = async () => {
    if (currentValue.trim() && template) {
      await templateService.addToHistory(template.type, currentValue.trim());
      onConfirm(currentValue.trim());
      onClose();
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setCurrentValue(suggestion);
    // Keep focus on the input to prevent keyboard dismissal
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const insertText = (text: string) => {
    setCurrentValue(prev => prev + text);
    // Keep focus on the input to prevent keyboard dismissal
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  if (!template) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Rename {template.type}: "{template.placeholder}"
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          {/* Current Value Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder={`Enter ${template.type} name...`}
              placeholderTextColor="#8E8E93"
              autoFocus
              selectTextOnFocus
            />
          </View>

          {/* Suggestions */}
          <Text style={styles.sectionTitle}>Recent & Common {template.type}s:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsContainer}
            contentContainerStyle={styles.suggestionsContent}
            keyboardShouldPersistTaps="handled"
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionButton}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Insert Buttons */}
          <Text style={styles.sectionTitle}>Quick Insert:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.quickInsertContainer}
            contentContainerStyle={styles.quickInsertContent}
            keyboardShouldPersistTaps="handled"
          >
            {getQuickInsertButtons(template.type).map((button, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickInsertButton}
                onPress={() => insertText(button.text)}
              >
                <Text style={styles.quickInsertText}>{button.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.confirmButton, !currentValue.trim() && styles.disabledButton]} 
              onPress={handleConfirm}
              disabled={!currentValue.trim()}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function getQuickInsertButtons(type: TemplateMatch['type']) {
  const common = [
    { label: '_', text: '_' },
    { label: 'CamelCase', text: '' }, // Special case
    { label: 'snake_case', text: '' }, // Special case
  ];

  switch (type) {
    case 'function':
      return [
        { label: 'get', text: 'get' },
        { label: 'set', text: 'set' },
        { label: 'is', text: 'is' },
        { label: 'has', text: 'has' },
        { label: 'calculate', text: 'calculate' },
        { label: 'process', text: 'process' },
        ...common,
      ];
    case 'class':
      return [
        { label: 'Manager', text: 'Manager' },
        { label: 'Handler', text: 'Handler' },
        { label: 'Controller', text: 'Controller' },
        { label: 'Service', text: 'Service' },
        ...common,
      ];
    case 'variable':
      return [
        { label: '[', text: '[' },
        { label: ']', text: ']' },
        { label: 'i', text: 'i' },
        { label: 'data', text: 'data' },
        { label: 'result', text: 'result' },
        { label: 'value', text: 'value' },
        { label: 'item', text: 'item' },
        { label: 'index', text: 'index' },
        ...common,
      ];
    case 'condition':
      return [
        { label: '>', text: ' > ' },
        { label: '<', text: ' < ' },
        { label: '==', text: ' == ' },
        { label: '!=', text: ' != ' },
        { label: 'is', text: ' is ' },
        { label: 'not', text: ' not ' },
        { label: 'and', text: ' and ' },
        { label: 'or', text: ' or ' },
      ];
    case 'module':
      return [
        { label: 'os', text: 'os' },
        { label: 'sys', text: 'sys' },
        { label: 'math', text: 'math' },
        { label: 'json', text: 'json' },
        { label: 'datetime', text: 'datetime' },
        { label: 'random', text: 'random' },
      ];
    default:
      return common;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    padding: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3C3C3E',
    fontFamily: 'FiraCode-Regular',
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  suggestionsContainer: {
    paddingBottom: 16,
  },
  suggestionsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  quickInsertContainer: {
    paddingBottom: 20,
  },
  quickInsertContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  quickInsertButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  quickInsertText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'FiraCode-Regular',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#3C3C3E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#3C3C3E',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});