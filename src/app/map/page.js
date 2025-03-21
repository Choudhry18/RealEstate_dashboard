'use client'
import React from 'react';
import PropertyMap from '@/components/Map';
import Box from '@/components/Box';
// Import other components you want to display

export default function MapPage() {
  const handleOptionsClick = () => {
    alert("Options clicked");
  }
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="h-[800px] w-full">
          <PropertyMap />
        </div>
    </div>
    );
  }