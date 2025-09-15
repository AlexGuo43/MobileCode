import * as FS from 'expo-file-system/legacy';

export const cacheDirectory = FS.cacheDirectory;
export const documentDirectory = FS.documentDirectory;

export async function ensureDir(uri: string) {
  try {
    await FS.makeDirectoryAsync(uri, { intermediates: true });
  } catch (e) {
    // ignore if exists
  }
}

export async function readText(uri: string) {
  return FS.readAsStringAsync(uri);
}

export async function writeText(uri: string, contents: string) {
  return FS.writeAsStringAsync(uri, contents);
}

export async function remove(uri: string, opts?: { idempotent?: boolean }) {
  return FS.deleteAsync(uri, { idempotent: true, ...opts });
}

export async function exists(uri: string) {
  const info = await FS.getInfoAsync(uri);
  return info.exists;
}

export async function stat(uri: string) {
  return FS.getInfoAsync(uri);
}

export async function list(dirUri: string) {
  return FS.readDirectoryAsync(dirUri);
}

export async function move(from: string, to: string) {
  return FS.moveAsync({ from, to });
}

