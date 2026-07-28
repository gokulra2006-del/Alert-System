import React from 'react';
import { BroadcastMessage } from '../types';

interface Props {
  broadcasts: BroadcastMessage[];
}

const TYPE_STYLES: Record<BroadcastMessage['type'], string> = {
  info: 'bg-blue-900/60 border-blue-500 text-blue-200',
  warning: 'bg-amber-900/60 border-amber-500 text-amber-200',
  critical: 'bg-red-900/60 border-red-500 text-red-200',
};

const TYPE_ICONS: Record<BroadcastMessage['type'], string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

export default function AlertBanner({ broadcasts }: Props) {
  if (!broadcasts.length) return null;

  const latest = broadcasts[0];

  return (
    <div
      className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm ${TYPE_STYLES[latest.type]}`}
    >
      <span className="text-lg leading-none mt-0.5">{TYPE_ICONS[latest.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white">{latest.sender}</div>
        <div className="truncate">{latest.text}</div>
        <div className="text-xs opacity-60 mt-0.5">
          {new Date(latest.sentAt).toLocaleTimeString()}
          {broadcasts.length > 1 && ` · ${broadcasts.length - 1} more`}
        </div>
      </div>
    </div>
  );
}
