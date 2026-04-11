'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface SessionEntry {
  sessionGroup: number;
  value: number;
  excluded: boolean;
  missed: boolean;
}

interface MemberEntry {
  id: number;
  nickname: string;
  total: number;
  sessions: SessionEntry[];
}

interface SessionInfo {
  sessionGroup: number;
  date: string;
}

interface ScoreChartProps {
  readonly members: MemberEntry[];
  readonly sessions: SessionInfo[];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16)];
}

function generateShades(baseHex: string, count: number): string[] {
  if (count === 0) return [];
  const rgb = hexToRgb(baseHex) ?? [0, 89, 130];
  const [r, g, b] = rgb;
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 1 : i / (count - 1);
    const blend = 0.7 * (1 - t);
    const nr = Math.round(r + (255 - r) * blend);
    const ng = Math.round(g + (255 - g) * blend);
    const nb = Math.round(b + (255 - b) * blend);
    return `rgb(${nr},${ng},${nb})`;
  });
}

export default function ScoreChart({ members, sessions }: ScoreChartProps) {
  const [primaryColor, setPrimaryColor] = useState('#005982');
  const [accentColor, setAccentColor] = useState('#e65100');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const style = getComputedStyle(document.body);
    const primary = style.getPropertyValue('--kn-primary').trim();
    const accent = style.getPropertyValue('--kn-accent').trim();
    if (primary) setPrimaryColor(primary);
    if (accent) setAccentColor(accent);
  }, []);

  const sessionKeys = sessions.map((s) => `s${s.sessionGroup}`);

  // Sort ascending by filtered total so highest scorer is rightmost
  const sorted = [...members].sort((a, b) => a.total - b.total);

  // Build bar data: only include non-excluded, non-missed sessions so bar height = filtered total
  const data = sorted.map((m) => {
    const entry: Record<string, number | string> = { nickname: m.nickname };
    for (const s of m.sessions) {
      if (!s.missed && !s.excluded) entry[`s${s.sessionGroup}`] = s.value;
    }
    // Ensure every session key is present (0 if not attended/excluded) so stacking works
    for (const key of sessionKeys) {
      if (!(key in entry)) entry[key] = 0;
    }
    return entry;
  });

  const sessionLabels: Record<string, string> = {};
  for (const s of sessions) {
    sessionLabels[`s${s.sessionGroup}`] = new Date(s.date).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
    });
  }

  const shades = generateShades(primaryColor, sessionKeys.length);

  // Custom tooltip: hovered segment value + member overall total
  function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number }[]; label?: string }) {
    if (!active || !payload || !hoveredKey) return null;
    const entry = payload.find((p) => p.dataKey === hoveredKey);
    if (!entry) return null;
    const member = sorted.find((m) => m.nickname === label);
    return (
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div>{sessionLabels[hoveredKey]}: <span style={{ fontWeight: 700 }}>{Number.parseFloat(Number(entry.value).toFixed(2))}</span></div>
        {member && <div style={{ marginTop: 2, color: '#6b7280' }}>Gesamt: <span style={{ fontWeight: 700 }}>{Number.parseFloat(member.total.toFixed(2))}</span></div>}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nickname" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Legend formatter={(name: string) => sessionLabels[name] ?? name} />
        {sessionKeys.map((key, i) => {
          const isHovered = hoveredKey === key;
          const isDimmed = hoveredKey !== null && !isHovered;
          return (
            <Bar
              key={key}
              dataKey={key}
              stackId="a"
              fill={isHovered ? accentColor : shades[i]}
              fillOpacity={isDimmed ? 0.25 : 1}
              activeBar={false}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
