'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface Part {
  id: number;
  name: string;
  unit: string;
  value: number;
  factor: number;
  bonus: number;
  variable: boolean;
  once: boolean;
}

interface Game {
  id: number;
  name: string;
  parts: Part[];
}

interface GamesOverviewProps {
  games: Game[];
  title: string;
  labels: {
    partName: string;
    unit: string;
    value: string;
    variable: string;
    once: string;
    unitPoints: string;
    unitEuro: string;
  };
}

function formatFormula(part: Part): string {
  const val = part.variable ? '~' : part.value.toFixed(2);
  const factor = part.factor.toFixed(2);
  const bonus = part.bonus.toFixed(2);
  // Simplify: omit factor if 1.0, omit bonus if 0.0
  const hasFactor = part.factor !== 1.0;
  const hasBonus = part.bonus !== 0.0;
  if (!hasFactor && !hasBonus) return val;
  if (!hasFactor) return `${val} + ${bonus}`;
  if (!hasBonus) return `${val} × ${factor}`;
  return `${val} × ${factor} + ${bonus}`;
}

export default function GamesOverview({ games, title, labels }: GamesOverviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left font-semibold text-lg bg-muted/40 hover:bg-muted/60 transition-colors cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="p-4 flex flex-wrap gap-4">
          {games.map((game) => (
            <div key={game.id} className="border rounded-lg overflow-hidden min-w-[220px] flex-1">
              <div
                className="px-4 py-2 font-semibold text-sm text-white"
                style={{ backgroundColor: 'var(--kn-primary, #005982)' }}
              >
                {game.name}
              </div>
              {game.parts.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-1.5 text-left font-medium text-xs">{labels.partName}</th>
                      <th className="px-3 py-1.5 text-left font-medium text-xs">{labels.unit}</th>
                      <th className="px-3 py-1.5 text-right font-medium text-xs">{labels.value}</th>
                      <th className="px-3 py-1.5 text-center font-medium text-xs" title={labels.variable}>~</th>
                      <th className="px-3 py-1.5 text-center font-medium text-xs" title={labels.once}>1×</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.parts.map((part) => (
                      <tr key={part.id} className="border-t">
                        <td className="px-3 py-1.5">{part.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground text-xs">
                          {part.unit === 'EURO' ? labels.unitEuro : labels.unitPoints}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs whitespace-nowrap">
                          {formatFormula(part)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {part.variable && <Check size={13} className="mx-auto text-green-600" />}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {part.once && <Check size={13} className="mx-auto text-green-600" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
