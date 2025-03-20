'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';

export default function Reflection() {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Define reflection content with headings as HTML
  const reflectionContent = [
    { type: 'heading', content: 'Project Overview' },
    { type: 'paragraph', content: 'Throughout the development of this dashboard project, I embarked on a journey that combined technical challenges with creative problem-solving. The process began with understanding the requirements and envisioning how best to present complex real estate data in an intuitive and visually appealing manner.' },
    
    { type: 'heading', content: 'Visualization Challenges' },
    { type: 'paragraph', content: 'One of the first challenges I encountered was deciding on the appropriate visualization techniques for different types of data. Real estate data encompasses various dimensions—geographical locations, price trends, property attributes, and market dynamics. Each required careful consideration to determine the most effective way to convey insights without overwhelming users.' },
    
    { type: 'heading', content: 'Interactive Maps Implementation' },
    { type: 'paragraph', content: 'The implementation of interactive maps proved particularly challenging yet rewarding. Balancing performance with functionality required thoughtful decisions about when to fetch data, how to cluster markers, and how to present information upon user interaction. I found that progressive loading and selective filtering significantly improved the user experience without compromising on the richness of the data presented.' },
    
    { type: 'heading', content: 'Responsive Design Considerations' },
    { type: 'paragraph', content: 'Another significant aspect of this project was ensuring the dashboard remained responsive across different devices. The challenge of maintaining visual hierarchy and usability on smaller screens pushed me to rethink layout strategies and interaction patterns. This led to the implementation of adaptive components that could reshape themselves based on available screen space while preserving their core functionality.' },
    
    { type: 'heading', content: 'Data Processing and Analysis' },
    { type: 'paragraph', content: 'Data processing and analysis formed the backbone of this dashboard. Cleaning, normalizing, and transforming raw data into actionable insights required careful consideration of both efficiency and accuracy. I implemented several preprocessing pipelines that could handle inconsistencies in the source data while extracting meaningful patterns that would be valuable to end-users.' },
    
    { type: 'heading', content: 'Conclusion' },
    { type: 'paragraph', content: 'Looking back at the development journey, I recognize that the most valuable lessons came from iterative refinement based on testing and feedback. Each round of improvements brought the dashboard closer to being a truly useful tool for understanding real estate data. This project has been a comprehensive exercise in translating raw data into meaningful insights through thoughtful design and technical implementation.' },
  ];
  
  // Convert the structured content to flat text for animation
  const flatText = reflectionContent.map(item => {
    if (item.type === 'heading') {
      return `## ${item.content} ##\n\n`;
    } else {
      return `${item.content}\n\n`;
    }
  }).join('');

  useEffect(() => {
    if (currentIndex < flatText.length) {
      const timer = setTimeout(() => {
        setDisplayText(prevText => prevText + flatText[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 15); // Adjust speed here (lower = faster)
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, flatText]);

  // Parse the displayed text to identify and format headings
  const renderFormattedText = () => {
    if (!displayText) return null;
    
    const parts = displayText.split('## ');
    return parts.map((part, index) => {
      if (index === 0) {
        return <p key={index} className="whitespace-pre-line leading-relaxed">{part}</p>;
      }
      
      const headingEnd = part.indexOf(' ##');
      if (headingEnd !== -1) {
        const heading = part.substring(0, headingEnd);
        const content = part.substring(headingEnd + 3);
        return (
          <React.Fragment key={index}>
            <h2 className="text-2xl font-bold mt-8 mb-4 text-blue-400">{heading}</h2>
            <p className="whitespace-pre-line leading-relaxed">{content}</p>
          </React.Fragment>
        );
      }
      return <p key={index} className="whitespace-pre-line leading-relaxed">{part}</p>;
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen text-white rounded-xl">
      <div className="container mx-auto px-4 py-12">
        <Link 
          href="/"
          className="inline-block mb-8 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          &larr; Back to Dashboard
        </Link>
        
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Project Reflection</h1>
          
          <div className="bg-slate-800 bg-opacity-50 rounded-lg p-8 shadow-xl prose prose-invert max-w-none">
            {renderFormattedText()}
            
            {currentIndex < flatText.length && (
              <div className="mt-4 flex justify-center">
                <button 
                  onClick={() => {
                    setDisplayText(flatText);
                    setCurrentIndex(flatText.length);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer hover:cursor-pointer"
                >
                  Skip Animation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}