// src/lib/tauri-api.js
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

export async function getAudioFiles(dir) {
  return await invoke('get_audio_files', { dir });
}

export async function moveFile(filePath, targetDir) {
  return await invoke('move_file', { filePath, targetDir });
}

export async function copyFile(filePath, targetDir) {
  return await invoke('copy_file', { filePath, targetDir });
}

export async function exitApp() {
  return await invoke('exit_app');
}

export { convertFileSrc };
