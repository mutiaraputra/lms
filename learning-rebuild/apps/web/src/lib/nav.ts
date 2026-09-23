// =============================================================================
// Konfigurasi navigasi berbasis peran (Fase 2 + pembaruan UI lengkap).
// Menentukan item sidebar per role. Setelah halaman diimplementasikan pada
// Step 3 (UI konten), semua item siap (`ready: true`) dan dapat diklik.
// =============================================================================

import type { Role } from './api';

export interface NavItem {
  label: string;
  href: string;
  /** Ikon inline (emoji) — cukup untuk fondasi; dapat diganti komponen ikon. */
  icon: string;
  roles: Role[];
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },

  // Pembelajaran
  { label: 'Materi', href: '/dashboard/materials', icon: '📚', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },
  { label: 'Ujian', href: '/dashboard/exams', icon: '📝', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },
  { label: 'Ujian Essay', href: '/dashboard/essay-exams', icon: '📄', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },
  { label: 'Tugas', href: '/dashboard/assignments', icon: '🗂️', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },

  // Kehadiran
  { label: 'Absensi', href: '/dashboard/attendance', icon: '📅', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },
  { label: 'Izin', href: '/dashboard/leave', icon: '✉️', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },

  // Penilaian & laporan (guru/admin)
  { label: 'Rekap Nilai', href: '/dashboard/reports', icon: '📊', roles: ['ADMIN', 'GURU'], ready: true },
  { label: 'Rekap Absensi', href: '/dashboard/attendance-reports', icon: '📈', roles: ['ADMIN'], ready: true },

  // Administrasi (admin)
  { label: 'Pengguna', href: '/dashboard/users', icon: '👥', roles: ['ADMIN'], ready: true },
  { label: 'Data Master', href: '/dashboard/master', icon: '⚙️', roles: ['ADMIN'], ready: true },
];

/** Item navigasi yang boleh dilihat sebuah role. */
export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/** Label ramah untuk role. */
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  GURU: 'Guru',
  SISWA: 'Siswa',
};
