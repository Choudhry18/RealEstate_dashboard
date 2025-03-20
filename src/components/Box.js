'use client';
import React from 'react';

const Box = ({ title, children, onOptionsClick }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      {/* Header with title and options button */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">{title}</h2>
        <button 
          onClick={onOptionsClick}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </div>
      
      {/* Content area */}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default Box;