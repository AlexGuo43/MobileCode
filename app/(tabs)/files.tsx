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
import { File, Folder, Plus, MoveVertical as MoreVertical, CreditCard as Edit3, Trash2, Cloud, Edit, HelpCircle } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthButton } from '@/components/AuthButton';
import { MobileCoderHelpModal } from '@/components/MobileCoderHelpModal';
import { syncService, SyncFile, StorageInfo } from '@/services/syncService';
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

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

  const loadStorageInfo = async () => {
    if (isAuthenticated) {
      const storage = await syncService.getStorageInfo();
      setStorageInfo(storage);
    } else {
      setStorageInfo(null);
    }
  };

  const loadFiles = async () => {
    if (!isAuthenticated) {
      // Show local files when not authenticated
      await loadLocalFiles();
      setStorageInfo(null);
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
      // Also load storage info when loading files
      await loadStorageInfo();
    } catch (err) {
      console.error('Failed to load cloud files', err);
      // Fallback to local files if cloud fails
      await loadLocalFiles();
      setStorageInfo(null);
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
            isSynced: false, // Local files are not synced
          });
        }
      }
      setFiles(items);
    } catch (err) {
      console.error('Failed to read local directory', err);
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
      if (fileToEdit.isSynced) {
        // Cloud file - download first
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
      } else {
        // Local file - use existing path
        router.push({
          pathname: '/(tabs)/editor',
          params: { 
            fileUri: fileToEdit.id // This is already the local path
          },
        });
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      Alert.alert('Error', 'Failed to open file');
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
          
          // If user is signed in, automatically sync the new file to cloud
          if (isAuthenticated) {
            try {
              const success = await syncService.uploadFile(path, finalFilename);
              if (success) {
                console.log(`New file ${finalFilename} uploaded to cloud`);
                // Refresh storage info after successful upload
                await loadStorageInfo();
              }
            } catch (syncError) {
              console.warn('Failed to sync new file to cloud:', syncError);
              if (syncError instanceof Error && syncError.message.includes('Storage Limit Exceeded')) {
                Alert.alert(
                  'Storage Limit Exceeded',
                  'Your file was created locally but could not be synced to the cloud due to storage limits. Please free up space or upgrade your plan.',
                  [{ text: 'OK' }]
                );
              }
              // Don't block the user - file is still created locally
            }
          }
          
          // Refresh the files list to show the new file
          loadFiles();
          
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
              if (fileToDelete.isSynced && isAuthenticated) {
                // Delete from cloud
                await syncService.deleteFile(fileToDelete.name);
              }
              
              // Delete local file
              const localPath = fileToDelete.isSynced ? ROOT_DIR + fileToDelete.name : fileToDelete.id;
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
          if (fileToRename.isSynced && isAuthenticated) {
            // Handle cloud file rename
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
            
            // Rename local copy
            const oldLocalPath = ROOT_DIR + fileToRename.name;
            const newLocalPath = ROOT_DIR + finalName;
            const localFileInfo = await FileSystem.getInfoAsync(oldLocalPath);
            if (localFileInfo.exists) {
              await FileSystem.moveAsync({ from: oldLocalPath, to: newLocalPath });
            }
          } else {
            // Handle local file rename
            const oldLocalPath = fileToRename.id; // This is the full path for local files
            const newLocalPath = ROOT_DIR + finalName;
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
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Files</Text>
          {storageInfo && isAuthenticated && (
            <View style={styles.storageInfo}>
              <View style={styles.storageBar}>
                <View 
                  style={[
                    styles.storageUsed, 
                    { width: `${storageInfo.percentUsed}%` },
                    storageInfo.percentUsed > 90 && styles.storageWarning
                  ]} 
                />
              </View>
              <Text style={styles.storageText}>
                {Math.round(storageInfo.used / 1024 / 1024 * 10) / 10}MB / {storageInfo.limit / 1024 / 1024}MB
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.helpButton} 
            onPress={() => setShowHelpModal(true)}
          >
            <HelpCircle size={20} color="#8E8E93" />
          </TouchableOpacity>
          <AuthButton 
            onAuthStateChange={(user) => {
              setIsAuthenticated(!!user);
              loadFiles(); // Reload files when auth state changes
            }}
            onFilesSync={() => {
              loadFiles(); // Refresh files list after sync
            }}
          />
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

      <MobileCoderHelpModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
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
  headerLeft: {
    flex: 1,
  },
  storageInfo: {
    marginTop: 6,
    gap: 4,
  },
  storageBar: {
    height: 4,
    backgroundColor: '#3C3C3E',
    borderRadius: 2,
    overflow: 'hidden',
    width: 120,
  },
  storageUsed: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  storageWarning: {
    backgroundColor: '#FF9500',
  },
  storageText: {
    color: '#8E8E93',
    fontSize: 11,
    fontFamily: 'System',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  helpButton: {
    padding: 8,
    borderRadius: 8,
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