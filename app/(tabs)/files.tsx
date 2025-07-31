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
import { File, Folder, Plus, MoveVertical as MoreVertical, CreditCard as Edit3, Trash2, Cloud, Edit } from 'lucide-react-native';
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
  isSynced?: boolean;
}

const ROOT_DIR = FileSystem.documentDirectory + 'files/';

export default function FilesScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
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
  }, []);

  // Reload files when tab comes into focus or auth state changes
  useFocusEffect(
    React.useCallback(() => {
      loadFiles();
    }, [isAuthenticated])
  );

  const loadFiles = async () => {
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
        isSynced: true,
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
      // Just select the file, don't navigate
      setSelectedFile(selectedFile === item.id ? null : item.id);
    } else {
      Alert.alert('Open Folder', `Opening folder ${item.name}`);
    }
  };

  const handleEditSelected = async () => {
    if (!selectedFile) return;
    
    const fileToEdit = files.find(f => f.id === selectedFile);
    if (!fileToEdit) return;
    
    try {
      // Download cloud file to local storage for editing
      const localPath = ROOT_DIR + fileToEdit.name;
      const success = await syncService.downloadFile(fileToEdit.name, localPath);
      
      if (success) {
        router.push({
          pathname: '/(tabs)/editor',
          params: { 
            fileUri: localPath,
            cloudFileName: fileToEdit.name 
          },
        });
      } else {
        Alert.alert('Error', 'Failed to load file');
      }
    } catch (error) {
      console.error('Failed to download file:', error);
      Alert.alert('Error', 'Failed to load file');
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
    Alert.prompt(
      'Create New File',
      'Enter a filename:',
      async (filename: string) => {
        if (!filename || !filename.trim()) {
          return; // User cancelled or entered empty name
        }
        
        let finalFilename = filename.trim();
        
        // Add .py extension if no extension provided
        if (!finalFilename.includes('.')) {
          finalFilename += '.py';
        }
        
        try {
          const path = `${ROOT_DIR}${finalFilename}`;
          await FileSystem.writeAsStringAsync(path, '# New file\n');
          
          // Navigate to editor with the new file
          router.push({
            pathname: '/(tabs)/editor',
            params: { 
              fileUri: path,
              cloudFileName: finalFilename 
            },
          });
        } catch (e) {
          console.error('Failed to create file', e);
          Alert.alert('Error', 'Failed to create file. Please try again.');
        }
      },
      'plain-text',
      'untitled.py' // Default filename
    );
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
    
    // Find the selected file to get its name
    const fileToDelete = files.find(f => f.id === selectedFile);
    if (!fileToDelete) return;
    
    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileToDelete.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (isAuthenticated) {
                // Delete from cloud
                await syncService.deleteFile(fileToDelete.name);
              }
              
              // Also delete local copy if it exists
              const localPath = ROOT_DIR + fileToDelete.name;
              await FileSystem.deleteAsync(localPath, { idempotent: true });
              
              setSelectedFile(null);
              loadFiles();
            } catch (e) {
              console.error('Failed to delete', e);
              Alert.alert('Error', 'Failed to delete file. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renameSelected = async () => {
    if (!selectedFile) return;
    
    // Find the selected file to get its current name
    const fileToRename = files.find(f => f.id === selectedFile);
    if (!fileToRename) return;
    
    Alert.prompt(
      'Rename File', 
      'Enter a new name:', 
      async (newName: string) => {
        if (!newName || !newName.trim()) return;
        
        let finalName = newName.trim();
        
        // Add extension if not provided
        if (!finalName.includes('.')) {
          const currentExt = fileToRename.extension;
          if (currentExt) {
            finalName += `.${currentExt}`;
          }
        }
        
        try {
          if (isAuthenticated) {
            // Get the file content first
            const cloudFiles = await syncService.getRemoteFiles();
            const currentFile = cloudFiles.find(f => f.filename === fileToRename.name);
            
            if (currentFile) {
              // Create temp file with new name and upload
              const tempPath = FileSystem.cacheDirectory + finalName;
              await FileSystem.writeAsStringAsync(tempPath, currentFile.content);
              
              // Upload with new name
              const uploadSuccess = await syncService.uploadFile(tempPath, finalName);
              
              if (uploadSuccess) {
                // Delete old file from cloud
                await syncService.deleteFile(fileToRename.name);
                
                // Clean up temp file
                await FileSystem.deleteAsync(tempPath, { idempotent: true });
              }
            }
          }
          
          // Also rename local copy if it exists
          const oldLocalPath = ROOT_DIR + fileToRename.name;
          const newLocalPath = ROOT_DIR + finalName;
          const localFileInfo = await FileSystem.getInfoAsync(oldLocalPath);
          if (localFileInfo.exists) {
            await FileSystem.moveAsync({ from: oldLocalPath, to: newLocalPath });
          }
          
          setSelectedFile(null);
          loadFiles();
        } catch (e) {
          console.error('Failed to rename', e);
          Alert.alert('Error', 'Failed to rename file. Please try again.');
        }
      },
      'plain-text',
      fileToRename.name // Default to current name
    );
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
      <View style={styles.fileActions}>
        {item.isSynced && (
          <View style={styles.syncIndicator}>
            <Cloud size={12} color="#007AFF" />
          </View>
        )}
        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={16} color="#8E8E93" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Files</Text>
        <View style={styles.headerActions}>
          <AuthButton onAuthStateChange={(user) => {
            setIsAuthenticated(!!user);
            loadFiles(); // Reload files when auth state changes
          }} />
          <TouchableOpacity style={styles.headerButton} onPress={handleCreateFile}>
            <Plus size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
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
          <TouchableOpacity style={styles.actionButton} onPress={handleEditSelected}>
            <Edit size={16} color="#007AFF" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
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
  fileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncIndicator: {
    padding: 4,
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