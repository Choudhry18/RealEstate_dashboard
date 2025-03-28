'use client'
import React from 'react';
import LeaseUpChart from '@/components/LeaseUpChart';
import Box from '@/components/Box';
// Import other components you want to display

export default function MapPage() {
  const handleOptionsClick = () => {
    alert("Options clicked");
  }
    return (
      <div className="max-w-6xl mx-auto p-6">
      <Box 
        title="Geographic Distribution" 
        onOptionsClick={handleOptionsClick}
      >
        <div className="h-[800px] w-full">
          <LeaseUpChart />
        </div>
      </Box>
    </div>
    );
  }