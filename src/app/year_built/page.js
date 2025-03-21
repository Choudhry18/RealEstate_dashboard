'use client'
import React from 'react';
import YearBuiltHistogram from '@/components/BuiltYear';
// Import other components you want to display

export default function MapPage() {
  const handleOptionsClick = () => {
    alert("Options clicked");
  }
    return (
      <div className="max-w-6xl mx-auto p-6 pt-16 md:pt-24"> {/* Added top padding */}
        <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">Property Analytics</h1> {/* Added title */}
        <div className="h-full w-full">
          <YearBuiltHistogram />
        </div>
      </div>
    );
  }