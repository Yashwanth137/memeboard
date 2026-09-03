'use client';

import { Bot } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected?: boolean;
  provider?: string;
  connectUrl?: string;
  collapsed?: boolean;
}

export default function ConnectionStatus({
  isConnected = true,
  provider = 'WhatsApp',
  connectUrl,
  collapsed = false,
}: ConnectionStatusProps) {
  if (collapsed) {
    return (
      <div
        className="flex items-center justify-center w-9 h-9 mx-auto rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 transition-colors relative group"
        title={`Content Agent: ${provider} (${isConnected ? 'Connected' : 'Not connected'})`}
      >
        <Bot className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
        <span
          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-surface ${
            isConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400'
          }`}
        />
      </div>
    );
  }

  const content = (
    <div className="px-3.5 py-2.5 rounded-xl bg-surface-elevated/50 border border-border-subtle/60 text-xs select-none hover:border-border-subtle transition-all">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary/60 mb-1.5">
        Content Agent
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-text-primary">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400'
            }`}
          />
          <span>{provider}</span>
        </div>
        <span className="text-[10px] font-semibold text-text-secondary/70">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );

  if (!isConnected && connectUrl) {
    return (
      <a href={connectUrl} target="_blank" rel="noopener noreferrer" className="block group">
        {content}
      </a>
    );
  }

  return content;
}
