'use client'
import React from 'react';
import YearBuiltHistogram from '@/components/BuiltYear';
import SubmarketPieChart from '@/components/PieChart';

export default function MapPage() {
  const handleOptionsClick = () => {
    alert("Options clicked");
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6 pt-16 md:pt-24"> 
      <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">Property Analytics</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <SubmarketPieChart />
      </div>
      
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>Data last updated: September 2020</p>
      </div>
    </div>
  );
}