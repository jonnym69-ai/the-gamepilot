import React, { useEffect, useState } from 'react';
import { Cpu, Gauge, HardDrive, MemoryStick, Monitor, RefreshCw } from 'lucide-react';
import { HardwareDetector } from '../services/HardwareDetector';

/**
 * Factual hardware readout — the real detected specs via Electron's
 * systeminformation, no scoring or performance verdicts.
 */
export default function SystemSpecsCard() {
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    HardwareDetector.getSystemInfo()
      .then((result) => setInfo(result))
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  if (failed) {
    return <p className="setting-description">Could not read system info on this device.</p>;
  }
  if (!info) {
    return <p className="setting-description">Detecting hardware…</p>;
  }

  const rows = [
    {
      icon: Cpu,
      label: 'CPU',
      value: info.cpu?.brand || info.cpu?.model || 'Unknown',
      detail: [info.cpu?.cores && `${info.cpu.cores} cores`, info.cpu?.speed && `${info.cpu.speed} GHz`]
        .filter(Boolean)
        .join(' · '),
    },
    {
      icon: Gauge,
      label: 'GPU',
      value: info.gpu?.model || 'Unknown',
      detail: info.gpu?.vramGB ? `${info.gpu.vramGB} GB VRAM` : '',
    },
    {
      icon: MemoryStick,
      label: 'Memory',
      value: info.ram?.total ? `${info.ram.total} GB ${info.ram.type || ''}`.trim() : 'Unknown',
      detail: info.ram?.speed ? `${info.ram.speed} MHz` : '',
    },
    {
      icon: Monitor,
      label: 'OS',
      value: [info.os?.distro, info.os?.release].filter(Boolean).join(' ') || 'Unknown',
      detail: info.os?.arch || '',
    },
    ...(Array.isArray(info.storage) ? info.storage : []).map((drive) => ({
      icon: HardDrive,
      label: 'Storage',
      value: drive.model || drive.name || 'Unknown drive',
      detail: [
        drive.size && `${drive.size} GB`,
        drive.isNVMe ? 'NVMe' : drive.isSSD ? 'SSD' : drive.type !== 'Unknown' ? drive.type : '',
      ]
        .filter(Boolean)
        .join(' · '),
    })),
  ];

  return (
    <div>
      <div className="settings-group" style={{ display: 'grid', gap: '8px' }}>
        {rows.map((row, index) => (
          <div key={index} className="setting-item" style={{ alignItems: 'center' }}>
            <row.icon size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>{row.label}</span>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {row.value}
                {row.detail && (
                  <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: '8px', fontSize: '0.9em' }}>
                    {row.detail}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={load}
        className="data-button export"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}
      >
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>
  );
}
