'use client';

import React, { useState } from 'react';
import { Search, MapPin, Radar, Power, Trash2, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface ActiveRadar {
  id: string;
  keyword: string;
  category: string;
  maxPrice: number;
  location: string;
  isActive: boolean;
}

const CATEGORIES = ['Kèo đấu', 'Đồ cũ'];
const LOCATIONS = ['Toàn quốc', 'Hà Nội', 'TP. HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng'];

// --- Radar Scan Button Animation ---
function RadarButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full py-3.5 rounded-xl font-semibold text-gray-900 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all duration-300 overflow-hidden"
    >
      {/* Radar ping on hover */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="w-6 h-6 rounded-full bg-amber-200 opacity-0 group-hover:animate-radar-ping" />
      </span>

      {/* Scanning line on hover */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="w-8 h-8 border-t-2 border-amber-700/40 rounded-full group-hover:animate-radar-scan" />
      </span>

      <span className="relative flex items-center justify-center gap-2">
        <Radar size={20} className="group-hover:rotate-12 transition-transform" />
        Tạo Radar
      </span>
    </button>
  );
}

export default function PremiumRadarSetup() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [maxPrice, setMaxPrice] = useState(500000);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [radars, setRadars] = useState<ActiveRadar[]>([
    {
      id: '1',
      keyword: 'Giày bóng đá Nike',
      category: 'Đồ cũ',
      maxPrice: 800000,
      location: 'TP. HCM',
      isActive: true,
    },
    {
      id: '2',
      keyword: 'Kèo cầu lông',
      category: 'Kèo đấu',
      maxPrice: 200000,
      location: 'Hà Nội',
      isActive: false,
    },
  ]);

  const handleCreate = () => {
    if (!keyword.trim()) return;
    const newRadar: ActiveRadar = {
      id: Date.now().toString(),
      keyword: keyword.trim(),
      category,
      maxPrice,
      location,
      isActive: true,
    };
    setRadars((prev) => [newRadar, ...prev]);
    setKeyword('');
  };

  const toggleRadar = (id: string) => {
    setRadars((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const deleteRadar = (id: string) => {
    setRadars((prev) => prev.filter((r) => r.id !== id));
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat('vi-VN').format(value) + 'đ';

  return (
    <div className="min-h-screen bg-gray-950 flex items-start justify-center p-4 pt-10">
      <div className="w-full max-w-md space-y-6">
        {/* --- Setup Card --- */}
        <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-gray-900 to-gray-950 p-6 shadow-xl shadow-amber-900/5">
          {/* Gold accent line at top */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Radar size={22} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Radar Tự Động</h2>
              <p className="text-xs text-amber-400/70">Săn Kèo & Đồ Ngon</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Keyword */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Từ khoá tìm kiếm</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="VD: Giày Nike size 42..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-800/70 border border-gray-700/50 text-white placeholder:text-gray-500 text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Danh mục</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-lg bg-gray-800/70 border border-gray-700/50 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Max Price Slider */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Giá tối đa: <span className="text-amber-400 font-medium">{formatPrice(maxPrice)}</span>
              </label>
              <input
                type="range"
                min={0}
                max={5000000}
                step={50000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-700 accent-amber-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 [&::-webkit-slider-thumb]:shadow-md"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>0đ</span>
                <span>5.000.000đ</span>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Khu vực</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-lg bg-gray-800/70 border border-gray-700/50 text-white text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <RadarButton onClick={handleCreate} />
            </div>
          </div>
        </div>

        {/* --- Active Radars List --- */}
        {radars.length > 0 && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Radar đang hoạt động ({radars.filter((r) => r.isActive).length})
            </h3>

            <div className="space-y-3">
              {radars.map((radar) => (
                <div
                  key={radar.id}
                  className={clsx(
                    'flex items-center justify-between p-3 rounded-xl border transition-colors',
                    radar.isActive
                      ? 'border-amber-500/20 bg-gray-800/50'
                      : 'border-gray-800 bg-gray-900/50 opacity-60'
                  )}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-white truncate">
                      {radar.keyword}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {radar.category} · {radar.location} · ≤{formatPrice(radar.maxPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleRadar(radar.id)}
                      className={clsx(
                        'relative w-9 h-5 rounded-full transition-colors',
                        radar.isActive ? 'bg-amber-500' : 'bg-gray-700'
                      )}
                      aria-label={radar.isActive ? 'Tắt radar' : 'Bật radar'}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                          radar.isActive ? 'left-[18px]' : 'left-0.5'
                        )}
                      />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => deleteRadar(radar.id)}
                      className="p-1 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                      aria-label="Xoá radar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
