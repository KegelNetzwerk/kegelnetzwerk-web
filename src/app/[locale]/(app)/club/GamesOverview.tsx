'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import PartPicThumb from '@/components/PartPicThumb';

interface Part {
  id: number;
  name: string;
  unit: string;
  value: number;
  factor: number;
  bonus: number;
  variable: boolean;
  once: boolean;
  description: string;
  pic: string;
}

interface Game {
  id: number;
  name: string;
  parts: Part[];
}

interface GamesOverviewProps {
  readonly games: Game[];
  readonly title: string;
  readonly labels: {
    readonly partName: string;
    readonly unit: string;
    readonly value: string;
    readonly variable: string;
    readonly once: string;
    readonly unitPoints: string;
    readonly unitEuro: string;
  };
}

function formatFormula(part: Part): string {
  const val = part.variable ? '~' : String(Number.parseFloat(part.value.toFixed(2)));
  const factor = String(Number.parseFloat(part.factor.toFixed(2)));
  const bonus = String(Number.parseFloat(part.bonus.toFixed(2)));
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
        <div className="p-4 space-y-4">
          {games.map((game) => (
            <div key={game.id} className="border rounded-lg overflow-hidden">
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
                      <React.Fragment key={part.id}>
                        <tr className="border-t">
                          <td className="px-3 py-1.5 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              <PartPicThumb pic={part.pic} size={20} />
                              {part.name}
                            </span>
                          </td>
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
                        {part.description && (
                          <tr>
                            <td colSpan={5} className="px-3 pb-3 pt-0">
                              <div className="relative mt-1.5 rounded-lg bg-muted px-3 py-2 shadow-sm">
                                <div className="absolute -top-1.5 left-5 h-3 w-3 rotate-45 bg-muted" />
                                <div
                                  className="prose prose-sm max-w-none text-muted-foreground"
                                  dangerouslySetInnerHTML={{ __html: part.description }}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
