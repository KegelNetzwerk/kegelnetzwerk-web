'use client';

import { useTranslations } from 'next-intl';

const TX_TYPE_COLORS: Record<string, string> = {
  PENALTY: 'bg-red-100 text-red-700',
  CLUB_FEE: 'bg-orange-100 text-orange-700',
  PAYMENT_IN: 'bg-green-100 text-green-700',
  PAYMENT_OUT: 'bg-red-100 text-red-700',
  CLUB_PURCHASE: 'bg-gray-100 text-gray-600',
  COLLECTIVE: 'bg-blue-100 text-blue-700',
  SESSION_PAYMENT: 'bg-cyan-100 text-cyan-700',
  REGULAR_INCOME: 'bg-teal-100 text-teal-700',
  RESET: 'bg-purple-100 text-purple-700',
  MANUAL: 'bg-yellow-100 text-yellow-700',
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface Props {
  readonly type: string;
  readonly sessionDate: string | null;
}

export default function TxTypeCell({ type, sessionDate }: Props) {
  const t = useTranslations('finance');
  return (
    <td className="px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TX_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-600'}`}>
          {t(`txType.${type}`)}
        </span>
        {type === 'SESSION_PAYMENT' && sessionDate && (
          <span className="text-xs text-cyan-700">
            {t('sessionPayment.sessionLabel', { date: fmtDate(sessionDate) })}
          </span>
        )}
      </div>
    </td>
  );
}
