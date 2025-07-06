import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { X, Plus, Edit3, Trash2, Save } from 'lucide-react-native';
import { storage } from '../utils/storage';

export interface KeyboardButton {
  label: string;
  text: string;
  id: string;
}

export interface KeyboardTab {
  key: string;
  label: string;
  data: KeyboardButton[];
}

interface KeyboardCustomizerProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (tabs: KeyboardTab[]) => void;
  initialTabs: KeyboardTab[];
}

export function KeyboardCustomizer({ isVisible, onClose, onSave, initialTabs }: KeyboardCustomizerProps) {
  const [tabs, setTabs] = useState<KeyboardTab[]>(initialTabs);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddButton, setShowAddButton] = useState(false);
  const [showAddTab, setShowAddTab] = useState(false);
  const [editingButton, setEditingButton] = useState<{ tabIndex: number; buttonIndex: number } | null>(null);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [newButtonText, setNewButtonText] = useState('');
  const [newTabLabel, setNewTabLabel] = useState('');

  useEffect(() => {
    setTabs(initialTabs);
  }, [initialTabs]);

  const addButton = () => {
    if (!newButtonLabel.trim() || newButtonText === '') {
      Alert.alert('Error', 'Please enter both label and text');
      return;
    }

    const newButton: KeyboardButton = {
      id: Date.now().toString(),
      label: newButtonLabel.trim(),
      text: newButtonText,
    };

    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      newTabs[activeTab] = {
        ...newTabs[activeTab],
        data: [...newTabs[activeTab].data, newButton],
      };
      return newTabs;
    });

    setNewButtonLabel('');
    setNewButtonText('');
    setShowAddButton(false);
  };

  const editButton = (tabIndex: number, buttonIndex: number) => {
    const button = tabs[tabIndex].data[buttonIndex];
    setNewButtonLabel(button.label);
    setNewButtonText(button.text);
    setEditingButton({ tabIndex, buttonIndex });
    setShowAddButton(true);
  };

  const saveEditedButton = () => {
    if (!editingButton || !newButtonLabel.trim() || newButtonText === '') {
      Alert.alert('Error', 'Please enter both label and text');
      return;
    }

    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      newTabs[editingButton.tabIndex].data[editingButton.buttonIndex] = {
        ...newTabs[editingButton.tabIndex].data[editingButton.buttonIndex],
        label: newButtonLabel.trim(),
        text: newButtonText,
      };
      return newTabs;
    });

    setNewButtonLabel('');
    setNewButtonText('');
    setShowAddButton(false);
    setEditingButton(null);
  };

  const deleteButton = (tabIndex: number, buttonIndex: number) => {
    Alert.alert(
      'Delete Button',
      'Are you sure you want to delete this button?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTabs(prevTabs => {
              const newTabs = [...prevTabs];
              newTabs[tabIndex].data.splice(buttonIndex, 1);
              return newTabs;
            });
          },
        },
      ]
    );
  };

  const addTab = () => {
    if (!newTabLabel.trim()) {
      Alert.alert('Error', 'Please enter a tab name');
      return;
    }

    const newTab: KeyboardTab = {
      key: Date.now().toString(),
      label: newTabLabel.trim(),
      data: [],
    };

    setTabs(prevTabs => [...prevTabs, newTab]);
    setNewTabLabel('');
    setShowAddTab(false);
    setActiveTab(tabs.length);
  };

  const deleteTab = (tabIndex: number) => {
    if (tabs.length <= 1) {
      Alert.alert('Error', 'Cannot delete the last tab');
      return;
    }

    Alert.alert(
      'Delete Tab',
      'Are you sure you want to delete this tab and all its buttons?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTabs(prevTabs => {
              const newTabs = [...prevTabs];
              newTabs.splice(tabIndex, 1);
              return newTabs;
            });
            if (activeTab >= tabIndex && activeTab > 0) {
              setActiveTab(activeTab - 1);
            }
          },
        },
      ]
    );
  };

  const saveChanges = async () => {
    try {
      await storage.setItem('customKeyboardTabs', JSON.stringify(tabs));
      onSave(tabs);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save keyboard settings');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'Are you sure you want to reset all keyboard settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.removeItem('customKeyboardTabs');
              setTabs(initialTabs);
              setActiveTab(0);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset keyboard settings');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal 
      visible={isVisible} 
      animationType="slide" 
      presentationStyle="fullScreen"
      supportedOrientations={['portrait']}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView 
            style={styles.flex1} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.header}>
          <Text style={styles.title}>Customize Keyboard</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === index && styles.activeTab]}
                onPress={() => setActiveTab(index)}
              >
                <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {tabs.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteTabButton}
                    onPress={() => deleteTab(index)}
                  >
                    <X size={12} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.addTabButton}
            onPress={() => setShowAddTab(true)}
          >
            <Plus size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.buttonList} showsVerticalScrollIndicator={true}>
          {tabs[activeTab]?.data.map((button, buttonIndex) => (
            <TouchableOpacity 
              key={button.id} 
              style={styles.buttonItem}
              activeOpacity={0.7}
              onPress={() => editButton(activeTab, buttonIndex)}
            >
              <View style={styles.buttonInfo}>
                <Text style={styles.buttonLabel}>{button.label}</Text>
                <Text style={styles.buttonText}>{button.text}</Text>
              </View>
              <View style={styles.buttonActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    editButton(activeTab, buttonIndex);
                  }}
                >
                  <Edit3 size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteButton(activeTab, buttonIndex);
                  }}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddButton(true)}
          >
            <Plus size={20} color="#007AFF" />
            <Text style={styles.addButtonText}>Add Button</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveChanges}>
            <Save size={16} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Add/Edit Button Modal */}
        <Modal visible={showAddButton} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView 
                style={styles.modalContent} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
              <Text style={styles.modalTitle}>
                {editingButton ? 'Edit Button' : 'Add Button'}
              </Text>
              
              <Text style={styles.inputLabel}>Label (displayed on button):</Text>
              <TextInput
                style={styles.input}
                value={newButtonLabel}
                onChangeText={setNewButtonLabel}
                placeholder="e.g., if, for, print"
                placeholderTextColor="#8E8E93"
              />
              
              <Text style={styles.inputLabel}>Text (inserted when pressed):</Text>
              <TextInput
                style={styles.input}
                value={newButtonText}
                onChangeText={setNewButtonText}
                placeholder="e.g., if condition:\n    "
                placeholderTextColor="#8E8E93"
                multiline
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddButton(false);
                    setEditingButton(null);
                    setNewButtonLabel('');
                    setNewButtonText('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={editingButton ? saveEditedButton : addButton}
                >
                  <Text style={styles.confirmButtonText}>
                    {editingButton ? 'Save' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Tab Modal */}
        <Modal visible={showAddTab} animationType="slide" transparent>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView 
                style={styles.modalContent} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
              <Text style={styles.modalTitle}>Add New Tab</Text>
              
              <Text style={styles.inputLabel}>Tab Name:</Text>
              <TextInput
                style={styles.input}
                value={newTabLabel}
                onChangeText={setNewTabLabel}
                placeholder="e.g., Custom, Utils, etc."
                placeholderTextColor="#8E8E93"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowAddTab(false);
                    setNewTabLabel('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={addTab}
                >
                  <Text style={styles.confirmButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  deleteTabButton: {
    marginLeft: 8,
    padding: 2,
  },
  addTabButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
    marginLeft: 8,
  },
  buttonList: {
    flex: 1,
    padding: 16,
  },
  buttonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  buttonInfo: {
    flex: 1,
    marginRight: 12,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Medium',
    marginBottom: 4,
  },
  buttonText: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  buttonActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#3C3C3E',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3C3C3E',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'FiraCode-Regular',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3C3C3E',
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
  },
  resetButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontFamily: 'FiraCode-Regular',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'FiraCode-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 12,
    fontFamily: 'FiraCode-Regular',
  },
  input: {
    backgroundColor: '#3C3C3E',
    color: '#FFFFFF',
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'FiraCode-Regular',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontFamily: 'FiraCode-Regular',
  },
  confirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Regular',
  },
  flex1: {
    flex: 1,
  },
});