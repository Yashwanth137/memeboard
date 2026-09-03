'use client';

import React, { useState } from 'react';
import { Search, X, ChevronDown, RotateCcw } from 'lucide-react';
import { PLATFORMS_FILTER_LIST } from '@/lib/platform';

interface MemberOption {
  id: string;
  name: string;
}

interface BoardToolbarProps {
  selectedMediaType: string;
  selectedPlatform: string;
  selectedMember: string;
  selectedDate: string;
  selectedSort: 'newest' | 'oldest';
  members: MemberOption[];
  searchQuery: string;
  onMediaTypeChange: (mediaType: string) => void;
  onPlatformChange: (platform: string) => void;
  onMemberChange: (memberId: string) => void;
  onDateChange: (dateKey: string) => void;
  onSortChange: (sort: 'newest' | 'oldest') => void;
  onSearchChange: (search: string) => void;
  onClearAllFilters: () => void;
}

export default function BoardToolbar({
  selectedMediaType,
  selectedPlatform,
  selectedMember,
  selectedDate,
  selectedSort,
  members,
  searchQuery,
  onMediaTypeChange,
  onPlatformChange,
  onMemberChange,
  onDateChange,
  onSortChange,
  onSearchChange,
  onClearAllFilters,
}: BoardToolbarProps) {
  const [showSearch, setShowSearch] = useState(Boolean(searchQuery));

  // Only All, Images, Videos (Removed Links)
  const contentTypes = [
    { id: '', label: 'All' },
    { id: 'image', label: 'Images' },
    { id: 'video', label: 'Videos' },
  ];

  const dateOptions = [
    { id: '', label: 'All Dates' },
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'Last 7 Days' },
    { id: 'month', label: 'This Month' },
  ];

  const hasActiveFilters = Boolean(
    selectedMediaType ||
    selectedPlatform ||
    selectedMember ||
    selectedDate ||
    selectedSort !== 'newest' ||
    searchQuery
  );

  return (
    <div className="sticky top-0 z-20 bg-page/95 backdrop-blur-md py-2.5 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10 border-b border-border-subtle/70 mb-4 transition-all">
      <div className="flex flex-col gap-2.5">
        {/* Top Row: All · Images · Videos switcher + Search */}
        <div className="flex items-center justify-between gap-3">
          {/* Content Type Filter Tabs */}
          <div className="flex items-center gap-1">
            {contentTypes.map((type) => {
              const isActive = selectedMediaType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => onMediaTypeChange(type.id)}
                  className={`px-3.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* Search Bar / Trigger */}
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {showSearch ? (
              <div className="relative w-48 sm:w-60 animate-fade-in flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search title, @user, url..."
                  className="w-full pl-8 pr-7 py-1 rounded-lg bg-surface border border-border-subtle text-text-primary placeholder:text-text-secondary/50 text-xs font-medium focus:outline-none focus:border-primary/50 transition-colors shadow-2xs"
                />
                <button
                  onClick={() => {
                    onSearchChange('');
                    setShowSearch(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  aria-label="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                title="Search posts"
                aria-label="Search posts"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Platform ▾   Member ▾   Date ▾   Newest ▾ */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {/* Platform ▾ */}
          <div className="relative shrink-0">
            <select
              value={selectedPlatform}
              onChange={(e) => onPlatformChange(e.target.value)}
              className={`appearance-none border text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer shadow-2xs ${
                selectedPlatform
                  ? 'bg-surface-elevated text-primary border-primary/40 font-bold'
                  : 'bg-surface hover:bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              {PLATFORMS_FILTER_LIST.map((p) => (
                <option key={p.id} value={p.id === 'all' ? '' : p.id}>
                  {p.id === 'all' ? 'Platform: All' : p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          </div>

          {/* Member ▾ */}
          <div className="relative shrink-0">
            <select
              value={selectedMember}
              onChange={(e) => onMemberChange(e.target.value)}
              className={`appearance-none border text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer shadow-2xs ${
                selectedMember
                  ? 'bg-surface-elevated text-primary border-primary/40 font-bold'
                  : 'bg-surface hover:bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              <option value="">Member: All</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          </div>

          {/* Date ▾ */}
          <div className="relative shrink-0">
            <select
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className={`appearance-none border text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer shadow-2xs ${
                selectedDate
                  ? 'bg-surface-elevated text-primary border-primary/40 font-bold'
                  : 'bg-surface hover:bg-surface-elevated border-border-subtle text-text-secondary hover:text-text-primary'
              }`}
            >
              {dateOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id === '' ? 'Date: All' : d.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          </div>

          {/* Sort ▾ */}
          <div className="relative shrink-0">
            <select
              value={selectedSort}
              onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest')}
              className="appearance-none bg-surface hover:bg-surface-elevated border border-border-subtle text-text-secondary hover:text-text-primary text-xs font-semibold rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-primary/50 transition-colors cursor-pointer shadow-2xs"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={onClearAllFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 ml-auto cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
