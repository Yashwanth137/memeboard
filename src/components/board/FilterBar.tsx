'use client';

import React from 'react';
import { PLATFORMS_FILTER_LIST, PlatformId } from '@/lib/platform';
import { Category } from '@/types/database';

interface MemberOption {
  id: string;
  name: string;
}

interface FilterBarProps {
  selectedPlatform: string;
  selectedCategory: string;
  selectedMember: string;
  selectedSort: 'newest' | 'oldest';
  categories: Category[];
  members: MemberOption[];
  onPlatformChange: (platform: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onMemberChange: (memberId: string) => void;
  onSortChange: (sort: 'newest' | 'oldest') => void;
  totalCount?: number;
}

export default function FilterBar({
  selectedPlatform,
  selectedCategory,
  selectedMember,
  selectedSort,
  categories,
  members,
  onPlatformChange,
  onCategoryChange,
  onMemberChange,
  onSortChange,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="v2-filter-bar">
      {/* Scrollable Content Type Pills */}
      <div className="v2-platform-pills">
        {[{ id: 'all', label: 'All' }, { id: 'image', label: 'Images' }, { id: 'video', label: 'Videos' }, { id: 'link', label: 'Links' }].map((p) => {
          const isActive =
            selectedPlatform === p.id ||
            (!selectedPlatform && p.id === 'all');

          return (
            <button
              key={p.id}
              onClick={() => onPlatformChange(p.id === 'all' ? '' : p.id)}
              className={`v2-platform-pill ${isActive ? 'active' : ''}`}
              id={`filter-content-${p.id}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters (Category, People, Sort) */}
      <div className="v2-dropdown-filters">
        {/* Category Dropdown */}
        <div className="v2-select-wrapper">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="v2-select"
            id="filter-category-select"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* User / Member Filter Dropdown */}
        <div className="v2-select-wrapper">
          <select
            value={selectedMember}
            onChange={(e) => onMemberChange(e.target.value)}
            className="v2-select"
            id="filter-member-select"
          >
            <option value="">All Users</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="v2-select-wrapper">
          <select
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value as 'newest' | 'oldest')}
            className="v2-select"
            id="filter-sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {totalCount !== undefined && (
          <span className="v2-filter-count text-muted">
            {totalCount} {totalCount === 1 ? 'post' : 'posts'}
          </span>
        )}
      </div>
    </div>
  );
}
