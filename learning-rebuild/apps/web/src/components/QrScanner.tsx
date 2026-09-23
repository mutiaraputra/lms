'use client';

// =============================================================================
// Komponen pemindai QR berbasis kamera (html5-qrcode).
// Hanya dipasang di sisi klien. Membersihkan stream kamera dengan benar pada
// unmount sehingga tidak membiarkan webcam tetap menyala.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export interface QrScannerProps {
  /** Dipanggil saat payload QR terbaca. */
  onDecode: (text: string) => void;
  /** Dipanggil bila pengguna menekan tombol berhenti manual. */
  onStop?: () => void;
  /** Aktif/nonaktif. Jika false, kamera dimatikan & UI disembunyikan. */
  active: boolean;
  /** Pesan bila kamera tidak tersedia / ditolak. */
  onError?: (msg: string) => void;
}

export function QrScanner({ onDecode, onStop, active, onError }: QrScannerProps) {
  const containerId = 'qr-scanner-region';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Mulai/hentikan scanner berdasarkan `active`.
  useEffect(() => {
    let cancelled = false;
    const cleanup = async () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch {
          /* diamkan */
        }
        try {
          scannerRef.current.clear();
        } catch {
          /* diamkan */
        }
        scannerRef.current = null;
      }
      if (!cancelled) setRunning(false);
    };

    if (!active) {
      cleanup();
      return () => {
        cancelled = true;
      };
    }

    // Bind handlers & mount scanner
    setStarting(true);
    setErrMsg('');
    const instance = new Html5Qrcode(containerId, {
      verbose: false,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    });
    scannerRef.current = instance;

    instance
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          // Panggil callback ke parent; parent bertanggung jawab menutup kamera
          // dan memicu panggilan API.
          onDecode(decodedText);
        },
        () => {
          /* diamkan: callback ini dipanggil tiap frame yang tidak mengandung QR */
        },
      )
      .then(() => {
        if (!cancelled) {
          setStarting(false);
          setRunning(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          typeof err === 'string'
            ? err
            : err?.message ||
              'Tidak dapat mengakses kamera. Pastikan browser mengizinkan akses kamera dan perangkat memiliki kamera.';
        setErrMsg(msg);
        setStarting(false);
        onError?.(msg);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Hentikan manual
  const handleStop = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
      } catch {
        /* diamkan */
      }
      try {
        scannerRef.current.clear();
      } catch {
        /* diamkan */
      }
      scannerRef.current = null;
    }
    setRunning(false);
    onStop?.();
  };

  if (!active) return null;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        <div id={containerId} className="aspect-video w-full" />
        {!running && !errMsg && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm text-white">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
              {starting ? 'Membuka kamera…' : 'Kamera siap'}
            </div>
          </div>
        )}
        {errMsg && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/90 px-6 text-center text-sm text-white">
            <div>
              <p className="mb-2 text-base font-semibold">⚠ Kamera tidak dapat dibuka</p>
              <p className="text-xs">{errMsg}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {running
            ? 'Arahkan kamera ke QR pengguna. Pemindaian otomatis berhenti setelah berhasil.'
            : 'Kamera belum aktif.'}
        </p>
        <button
          onClick={handleStop}
          disabled={!running && !starting}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          ⏹ Hentikan Kamera
        </button>
      </div>
    </div>
  );
}
