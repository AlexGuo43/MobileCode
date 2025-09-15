import { Platform } from 'react-native';
import * as FS from '@/utils/fs';

interface Storage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

// File-based storage implementation that persists to device storage
class FileStorage implements Storage {
  private getFilePath(key: string): string {
    return `${FS.documentDirectory}${key}.json`;
  }

  async getItem(key: string): Promise<string | null> {
    console.log('FileStorage getItem called for key:', key);
    
    // For web, use localStorage
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          const value = localStorage.getItem(key);
          console.log('Web localStorage getValue:', value);
          return value;
        }
      } catch (error) {
        console.warn('localStorage not available on web:', error);
      }
    }
    
    // For mobile, use file system
    try {
      const filePath = this.getFilePath(key);
      const fileExists = await FS.stat(filePath);
      
      if (!fileExists.exists) {
        console.log('File does not exist:', filePath);
        return null;
      }
      
      const value = await FS.readText(filePath);
      console.log('File storage getValue:', value);
      return value;
    } catch (error) {
      console.warn('Error reading from file storage:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    console.log('FileStorage setItem called for key:', key, 'value length:', value.length);
    
    // For web, use localStorage
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
          console.log('Saved to web localStorage');
          return;
        }
      } catch (error) {
        console.warn('localStorage not available on web:', error);
        return;
      }
    }
    
    // For mobile, use file system
    try {
      const filePath = this.getFilePath(key);
      await FS.writeText(filePath, value);
      console.log('Saved to file storage:', filePath);
    } catch (error) {
      console.warn('Error writing to file storage:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    console.log('FileStorage removeItem called for key:', key);
    
    // For web, use localStorage
    if (Platform.OS === 'web') {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          console.log('Removed from web localStorage');
          return;
        }
      } catch (error) {
        console.warn('localStorage not available on web:', error);
        return;
      }
    }
    
    // For mobile, use file system
    try {
      const filePath = this.getFilePath(key);
      const fileExists = await FS.stat(filePath);
      
      if (fileExists.exists) {
        await FS.remove(filePath);
        console.log('Removed from file storage:', filePath);
      }
    } catch (error) {
      console.warn('Error removing from file storage:', error);
      throw error;
    }
  }
}

export const storage = new FileStorage();
