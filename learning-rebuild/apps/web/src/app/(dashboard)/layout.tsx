// =============================================================================
// Layout grup rute terproteksi (Fase 2). Semua halaman di dalam grup
// (dashboard) dibungkus penjaga autentikasi + kerangka aplikasi (sidebar +
// header). Grup rute `(dashboard)` tidak memengaruhi URL.
// =============================================================================

import { RequireAuth } from '@/components/RequireAuth';
import { AppShell } from '@/components/AppShell';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
