'use client';

import { Bot } from 'lucide-react';

interface ConnectionStatusProps {
  isTelegramConnected?: boolean;
  isWhatsAppConnected?: boolean;
  collapsed?: boolean;
  onOpenSettings?: () => void;
}

export default function ConnectionStatus({
  isTelegramConnected = false,
  isWhatsAppConnected = false,
  collapsed = false,
  onOpenSettings,
}: ConnectionStatusProps) {
  const hasAnyConnection = isTelegramConnected || isWhatsAppConnected;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center justify-center w-9 h-9 mx-auto rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 transition-colors relative group"
        title={`Agents: Telegram (${isTelegramConnected ? 'Connected' : 'Disconnected'}), WhatsApp (${isWhatsAppConnected ? 'Connected' : 'Disconnected'})`}
      >
        <Bot className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors" />
        <span
          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-surface ${
            hasAnyConnection ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400'
          }`}
        />
      </button>
    );
  }

  return (
    <div 
      onClick={onOpenSettings}
      className={`px-3 py-2 rounded-xl bg-surface-elevated/50 border border-border-subtle/60 text-xs select-none hover:border-border-subtle transition-all space-y-2 ${
        onOpenSettings ? 'cursor-pointer hover:bg-surface-elevated/80' : ''
      }`}
      title="Click to open messaging settings"
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-extrabold uppercase tracking-widest text-text-secondary/60">
          Content Agents
        </span>
        <span className="text-[9px] text-text-secondary/50 font-medium">Settings ↗</span>
      </div>

      <div className="space-y-1.5">
        {/* Telegram */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-text-primary text-[11px]">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isTelegramConnected
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            <span>Telegram</span>
          </div>
          <span
            className={`text-[10px] ${
              isTelegramConnected ? 'font-bold text-emerald-500' : 'font-medium text-text-secondary/70'
            }`}
          >
            {isTelegramConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-text-primary text-[11px]">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isWhatsAppConnected
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            />
            <span>WhatsApp</span>
          </div>
          <span
            className={`text-[10px] ${
              isWhatsAppConnected ? 'font-bold text-emerald-500' : 'font-medium text-text-secondary/70'
            }`}
          >
            {isWhatsAppConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
