// =============================================================================
// Pembantu unduh respons API sebagai blob (mis. PDF recap).
// =============================================================================

import { getAuthToken, API_BASE } from './api';

export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`Unduhan gagal (${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // coba ambil dari header Content-Disposition jika ada
  const cd = res.headers.get('content-disposition') || '';
  const match = /filename="?([^"]+)"?/i.exec(cd);
  a.download = (match && match[1]) || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
