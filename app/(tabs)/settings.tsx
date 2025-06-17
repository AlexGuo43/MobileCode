import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Switch,
} from 'react-native';
import {
  Palette,
  Type,
  Keyboard,
  Bell,
  Shield,
  Info,
  ChevronRight,
} from 'lucide-react-native';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  type: 'toggle' | 'navigation';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [autoComplete, setAutoComplete] = useState(true);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [notifications, setNotifications] = useState(false);

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        {
          id: '1',
          title: 'Dark Mode',
          subtitle: 'Use dark theme for better coding experience',
          icon: <Palette size={20} color="#007AFF" />,
          type: 'toggle' as const,
          value: darkMode,
          onToggle: setDarkMode,
        },
      ],
    },
    {
      title: 'Editor',
      items: [
        {
          id: '2',
          title: 'Auto Complete',
          subtitle: 'Enable intelligent code completion',
          icon: <Type size={20} color="#34C759" />,
          type: 'toggle' as const,
          value: autoComplete,
          onToggle: setAutoComplete,
        },
        {
          id: '3',
          title: 'Line Numbers',
          subtitle: 'Show line numbers in editor',
          icon: <Type size={20} color="#FF9500" />,
          type: 'toggle' as const,
          value: lineNumbers,
          onToggle: setLineNumbers,
        },
        {
          id: '4',
          title: 'Custom Keyboard',
          subtitle: 'Configure programming shortcuts',
          icon: <Keyboard size={20} color="#5856D6" />,
          type: 'navigation' as const,
          onPress: () => console.log('Open keyboard settings'),
        },
      ],
    },
    {
      title: 'General',
      items: [
        {
          id: '5',
          title: 'Notifications',
          subtitle: 'Get notified about important events',
          icon: <Bell size={20} color="#FF3B30" />,
          type: 'toggle' as const,
          value: notifications,
          onToggle: setNotifications,
        },
        {
          id: '6',
          title: 'Privacy & Security',
          subtitle: 'Manage your privacy settings',
          icon: <Shield size={20} color="#007AFF" />,
          type: 'navigation' as const,
          onPress: () => console.log('Open privacy settings'),
        },
        {
          id: '7',
          title: 'About',
          subtitle: 'App version and information',
          icon: <Info size={20} color="#8E8E93" />,
          type: 'navigation' as const,
          onPress: () => console.log('Open about page'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingIcon}>
        {item.icon}
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <View style={styles.settingAction}>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#3A3A3C', true: '#34C759' }}
            thumbColor={item.value ? '#FFFFFF' : '#F4F3F4'}
          />
        ) : (
          <ChevronRight size={16} color="#8E8E93" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Settings List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Mobile Code Editor</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appDescription}>
            A powerful mobile code editor designed for developers who want to code on the go.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  sectionContent: {
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
  },
  settingAction: {
    marginLeft: 12,
  },
  appInfo: {
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 12,
  },
  appDescription: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});