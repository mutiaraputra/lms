// =============================================================================
// Konfigurasi navigasi berbasis peran (Fase 2 — fondasi frontend).
// Menentukan item sidebar per role. Sebagian rute dibangun di Step 3;
// item bertanda `ready: false` tampil sebagai "segera hadir" sampai halaman
// tersedia, agar navigasi tidak menautkan ke halaman kosong.
// =============================================================================

import type { Role } from './api';

export interface NavItem {
  label: string;
  href: string;
  /** Ikon inline (emoji) — cukup untuk fondasi; dapat diganti komponen ikon. */
  icon: string;
  roles: Role[];
  /** false = halaman belum dibuat (Step 3). */
  ready: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', roles: ['ADMIN', 'GURU', 'SISWA'], ready: true },

  // Pembelajaran
  { label: 'Materi', href: '/dashboard/materials', icon: '📚', roles: ['ADMIN', 'GURU', 'SISWA'], ready: false },
  { label: 'Ujian', href: '/dashboard/exams', icon: '📝', roles: ['ADMIN', 'GURU', 'SISWA'], ready: false },
  { label: 'Tugas', href: '/dashboard/assignments', icon: '🗂️', roles: ['ADMIN', 'GURU', 'SISWA'], ready: false },

  // Kehadiran
  { label: 'Absensi', href: '/dashboard/attendance', icon: '📅', roles: ['ADMIN', 'GURU', 'SISWA'], ready: false },
  { label: 'Izin', href: '/dashboard/leave', icon: '✉️', roles: ['ADMIN', 'GURU', 'SISWA'], ready: false },

  // Penilaian & laporan (guru/admin)
  { label: 'Rekap Nilai', href: '/dashboard/reports', icon: '📊', roles: ['ADMIN', 'GURU'], ready: false },

  // Administrasi (admin)
  { label: 'Pengguna', href: '/dashboard/users', icon: '👥', roles: ['ADMIN'], ready: false },
  { label: 'Data Master', href: '/dashboard/master', icon: '⚙️', roles: ['ADMIN'], ready: false },
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
