// src/lib/utils.js

export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(ms) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: '2-digit'
  });
}

export function updateZoom(level) {
  document.documentElement.style.setProperty('--zoom-level', level.toFixed(2));
}
