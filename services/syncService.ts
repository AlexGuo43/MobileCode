import * as FileSystem from 'expo-file-system';
import { authService } from './authService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://backend-production-a87d.up.railway.app/api';

export interface SyncFile {
  id: string;
  filename: string;
  content: string;
  file_type: string;
  last_modified: string;
  version: number;
  device_name: string;
}

export interface SyncResponse {
  files: SyncFile[];
  conflicts: Array<{
    filename: string;
    local_version: number;
    remote_version: number;
    local_modified: string;
    remote_modified: string;
    remote_content: string;
  }>;
}

export interface SyncResults {
  success: number;
  failed: number;
  conflicts: number;
}

class SyncService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async uploadFile(localFilePath: string, filename: string): Promise<boolean> {
    try {
      const content = await FileSystem.readAsStringAsync(localFilePath);
      const fileStats = await FileSystem.getInfoAsync(localFilePath);
      const fileType = this.getFileTypeFromFilename(filename);

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/files`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename,
          content,
          file_type: fileType,
          last_modified: new Date(fileStats.modificationTime! * 1000).toISOString(),
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Conflict detected
        console.warn('File conflict detected:', data.data);
        return false;
      }

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return true;
    } catch (error) {
      console.error('Upload file error:', error);
      return false;
    }
  }

  async downloadFile(filename: string, localFilePath: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/files/${encodeURIComponent(filename)}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('File not found on server:', filename);
          return false;
        }
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const data = await response.json();
      const file = data.data;

      // Ensure directory exists
      const directory = localFilePath.substring(0, localFilePath.lastIndexOf('/'));
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }

      await FileSystem.writeAsStringAsync(localFilePath, file.content);
      
      return true;
    } catch (error) {
      console.error('Download file error:', error);
      return false;
    }
  }

  async syncAllFiles(): Promise<SyncResults> {
    const results: SyncResults = { success: 0, failed: 0, conflicts: 0 };
    
    try {
      const ROOT_DIR = FileSystem.documentDirectory + 'files/';
      
      // Ensure directory exists
      const dirInfo = await FileSystem.getInfoAsync(ROOT_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(ROOT_DIR, { intermediates: true });
      }

      // Get all local files
      const localFiles: Array<{ filename: string; content: string; file_type: string; last_modified: string }> = [];
      
      try {
        const fileNames = await FileSystem.readDirectoryAsync(ROOT_DIR);
        
        for (const fileName of fileNames) {
          const filePath = ROOT_DIR + fileName;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          
          if (!fileInfo.isDirectory && this.shouldSyncFile(fileName)) {
            try {
              const content = await FileSystem.readAsStringAsync(filePath);
              const fileType = this.getFileTypeFromFilename(fileName);
              const lastModified = new Date(fileInfo.modificationTime! * 1000).toISOString();
              
              localFiles.push({
                filename: fileName,
                content,
                file_type: fileType,
                last_modified: lastModified,
              });
            } catch (error) {
              console.error(`Failed to read file ${fileName}:`, error);
              results.failed++;
            }
          }
        }
      } catch (error) {
        console.warn('Failed to read files directory:', error);
      }

      // Sync with server
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ files: localFiles }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      const syncResponse: SyncResponse = data.data;

      // Handle conflicts
      results.conflicts = syncResponse.conflicts.length;
      for (const conflict of syncResponse.conflicts) {
        console.warn('File conflict:', conflict);
        // For now, we'll count conflicts as failed syncs
        // In the future, you might want to show a UI for conflict resolution
        results.failed++;
      }

      // Download updated files from server
      for (const serverFile of syncResponse.files) {
        try {
          const localPath = ROOT_DIR + serverFile.filename;
          await FileSystem.writeAsStringAsync(localPath, serverFile.content);
          results.success++;
        } catch (error) {
          console.error(`Failed to write file ${serverFile.filename}:`, error);
          results.failed++;
        }
      }

      console.log('Sync completed:', results);
      
    } catch (error) {
      console.error('Sync all files error:', error);
      results.failed = Math.max(results.failed, 1); // Ensure we report at least one failure
    }

    return results;
  }

  async getRemoteFiles(): Promise<SyncFile[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/files`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch remote files: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Get remote files error:', error);
      return [];
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          // File doesn't exist on server, consider it a success
          return true;
        }
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Delete file error:', error);
      return false;
    }
  }

  async getSyncStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    lastSync: string | null;
    devices: Array<{ name: string; lastActive: string; fileCount: number }>;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sync/stats`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sync stats: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Get sync stats error:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        lastSync: null,
        devices: [],
      };
    }
  }

  private shouldSyncFile(filename: string): boolean {
    // Skip hidden files and certain file types
    if (filename.startsWith('.')) {
      return false;
    }

    const ext = filename.split('.').pop()?.toLowerCase();
    const syncableExtensions = [
      'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h',
      'css', 'html', 'md', 'txt', 'json', 'xml', 'php', 'rb',
      'go', 'rs', 'swift', 'kt', 'dart', 'vue', 'svelte'
    ];
    
    return ext ? syncableExtensions.includes(ext) : false;
  }

  private getFileTypeFromFilename(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const typeMap: { [key: string]: string } = {
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'txt': 'text',
      'json': 'json',
      'xml': 'xml',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte',
    };
    return typeMap[ext || ''] || 'text';
  }
}

export const syncService = new SyncService();