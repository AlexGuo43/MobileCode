import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { File, Folder, Plus, MoveVertical as MoreVertical, CreditCard as Edit3, Trash2, Cloud, HardDrive } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthButton } from '@/components/AuthButton';
import { syncService, SyncFile } from '@/services/syncService';
import { authService } from '@/services/authService';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modified: string;
  extension?: string;
  isCloud?: boolean;
}

type TabType = 'local' | 'cloud';

const ROOT_DIR = FileSystem.documentDirectory + 'files/';

export default function FilesScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('local');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
      } catch (e) {
        // directory probably exists
      }
      
      // Check auth state
      const user = await authService.getCurrentUser();
      setIsAuthenticated(!!user);
      
      loadFiles();
    })();
  }, [activeTab]);

  // Reload files when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadFiles();
    }, [])
  );

  const loadFiles = async () => {
    if (activeTab === 'local') {
      await loadLocalFiles();
    } else {
      await loadCloudFiles();
    }
  };

  const loadLocalFiles = async () => {
    try {
      const names = await FileSystem.readDirectoryAsync(ROOT_DIR);
      const items: FileItem[] = [];
      for (const name of names) {
        const info = await FileSystem.getInfoAsync(ROOT_DIR + name);
        if (info.exists) {
          items.push({
            id: info.uri,
            name,
            type: info.isDirectory ? 'folder' : 'file',
            modified: info.modificationTime
              ? new Date(info.modificationTime * 1000).toLocaleDateString()
              : '',
            extension: name.split('.').pop(),
            isCloud: false,
          });
        }
      }
      setFiles(items);
    } catch (err) {
      console.error('Failed to read directory', err);
    }
  };

  const loadCloudFiles = async () => {
    if (!isAuthenticated) {
      setFiles([]);
      return;
    }

    try {
      const cloudFiles = await syncService.getRemoteFiles();
      const items: FileItem[] = cloudFiles.map((file: SyncFile) => ({
        id: file.id,
        name: file.filename,
        type: 'file' as const,
        modified: new Date(file.last_modified).toLocaleDateString(),
        extension: file.filename.split('.').pop(),
        isCloud: true,
      }));
      setFiles(items);
    } catch (err) {
      console.error('Failed to load cloud files', err);
      setFiles([]);
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'folder') {
      return <Folder size={20} color="#FFD700" />;
    }
    
    const iconColor = {
      py: '#3776AB',
      js: '#F7DF1E',
      json: '#000000',
      md: '#083FA1',
      css: '#1572B6',
    }[item.extension || ''] || '#8E8E93';
    
    return <File size={20} color={iconColor} />;
  };

  const handleFilePress = (item: FileItem) => {
    if (item.type === 'file') {
      setSelectedFile(item.id);
      if (item.isCloud) {
        // For cloud files, pass the filename and indicate it's from cloud
        router.push({
          pathname: '/(tabs)/editor',
          params: { 
            cloudFileName: item.name,
            isCloudFile: 'true'
          },
        });
      } else {
        // For local files, use the existing fileUri approach
        router.push({
          pathname: '/(tabs)/editor',
          params: { fileUri: item.id },
        });
      }
    } else {
      Alert.alert('Open Folder', `Opening folder ${item.name}`);
    }
  };

  const handleCreateFile = () => {
    Alert.alert(
      'Create New',
      'What would you like to create?',
      [
        { text: 'File', onPress: () => createFile() },
        { text: 'Folder', onPress: () => createFolder() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const createFile = async () => {
    try {
      const path = `${ROOT_DIR}untitled_${Date.now()}.py`;
      await FileSystem.writeAsStringAsync(path, '');
      loadFiles();
    } catch (e) {
      console.error('Failed to create file', e);
    }
  };

  const createFolder = async () => {
    try {
      const path = `${ROOT_DIR}new_folder_${Date.now()}`;
      await FileSystem.makeDirectoryAsync(path);
      loadFiles();
    } catch (e) {
      console.error('Failed to create folder', e);
    }
  };

  const deleteSelected = async () => {
    if (!selectedFile) return;
    try {
      await FileSystem.deleteAsync(selectedFile, { idempotent: true });
      setSelectedFile(null);
      loadFiles();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const renameSelected = async () => {
    if (!selectedFile) return;
    Alert.prompt('Rename', 'Enter a new name', async (text) => {
      if (!text) return;
      try {
        const newPath = ROOT_DIR + text;
        await FileSystem.moveAsync({ from: selectedFile, to: newPath });
        setSelectedFile(null);
        loadFiles();
      } catch (e) {
        console.error('Failed to rename', e);
      }
    });
  };

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      style={[
        styles.fileItem,
        selectedFile === item.id && styles.selectedFile,
      ]}
      onPress={() => handleFilePress(item)}
    >
      <View style={styles.fileIcon}>
        {getFileIcon(item)}
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName}>{item.name}</Text>
        <View style={styles.fileDetails}>
          {item.size && <Text style={styles.fileSize}>{item.size}</Text>}
          <Text style={styles.fileModified}>{item.modified}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.moreButton}>
        <MoreVertical size={16} color="#8E8E93" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Files</Text>
        <View style={styles.headerActions}>
          <AuthButton onAuthStateChange={(user) => setIsAuthenticated(!!user)} />
          <TouchableOpacity style={styles.headerButton} onPress={handleCreateFile}>
            <Plus size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'local' && styles.activeTab]}
          onPress={() => setActiveTab('local')}
        >
          <HardDrive size={16} color={activeTab === 'local' ? '#007AFF' : '#8E8E93'} />
          <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
            Local
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'cloud' && styles.activeTab]}
          onPress={() => setActiveTab('cloud')}
          disabled={!isAuthenticated}
        >
          <Cloud size={16} color={activeTab === 'cloud' ? '#007AFF' : (isAuthenticated ? '#8E8E93' : '#4C4C4E')} />
          <Text style={[
            styles.tabText, 
            activeTab === 'cloud' && styles.activeTabText,
            !isAuthenticated && styles.disabledTabText
          ]}>
            Cloud
          </Text>
        </TouchableOpacity>
      </View>

      {/* Files List */}
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        renderItem={renderFileItem}
        style={styles.filesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Actions */}
      {selectedFile && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.actionButton} onPress={renameSelected}>
            <Edit3 size={16} color="#007AFF" />
            <Text style={styles.actionText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={deleteSelected}>
            <Trash2 size={16} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3C3C3E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#3C3C3E',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
  activeTabText: {
    color: '#007AFF',
  },
  disabledTabText: {
    color: '#4C4C4E',
  },
  filesList: {
    flex: 1,
    paddingTop: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
  },
  selectedFile: {
    backgroundColor: '#007AFF',
  },
  fileIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'FiraCode-Regular',
    marginBottom: 2,
  },
  fileDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  fileSize: {
    color: '#8E8E93',
    fontSize: 12,
  },
  fileModified: {
    color: '#8E8E93',
    fontSize: 12,
  },
  moreButton: {
    padding: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2C2C2E',
    borderTopWidth: 1,
    borderTopColor: '#3C3C3E',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#3C3C3E',
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    color: '#007AFF',
    fontSize: 14,
    fontFamily: 'FiraCode-Regular',
  },
});