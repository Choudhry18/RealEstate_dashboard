'use client'
import React from 'react';
import PropertyMap from '@/components/Map';
import Box from '@/components/Box';
// Import other components you want to display

export default function MapPage() {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="h-screen max-h-[calc(100vh-120px)] w-full">          
          <PropertyMap />
        </div>
    </div>
    );
  }