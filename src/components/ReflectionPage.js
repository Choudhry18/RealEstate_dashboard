'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';

export default function Reflection() {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Define reflection content with headings as HTML
  
const reflectionContent = [    
  { type: 'heading', content: 'Prompting Strategy Advantages' },
  { type: 'paragraph', content: 'The multi-agent prompting architecture with specialized prompts for different question types (FACT, COMPARISON, INVESTMENT, MARKET) enables contextually appropriate analysis tailored to specific query intents. By implementing question classification first, then targeted data retrieval, the system efficiently processes complex real estate inquiries without requiring users to specify question categories themselves.' },
  { type: 'paragraph', content: 'My approach grounds responses in factual property data from the provided dataset with structured templates and few-shot examples for consistent, professional formatting. The specialized data fetching strategies ensure each question type receives precisely the necessary context, reducing token usage while maximizing relevance. The web search augmentation for market and investment questions provides current trends with source citations, enhancing credibility and addressing historical data limitations.' },
  { type: 'paragraph', content: 'The fallback mechanisms ensure graceful degradation when specific data points are missing (for missing rent years it tells the LLM that the property hasn\'t been leased yet). These architectural decisions collectively enable more nuanced, data-driven property analysis than would be possible with simpler prompts.' },
  
  { type: 'heading', content: 'Prompting Strategy Limitations' },
  { type: 'paragraph', content: 'Despite the sophisticated architecture, the quality of responses heavily depends on available property data, with properties having limited historical information receiving less nuanced analysis. Web search augmentation only partially addresses these gaps and introduces reliability concerns with external information that may be outdated or inaccurate.' },
  { type: 'paragraph', content: 'The rigid response formatting templates may compel the model to generate insights even when data is insufficient, potentially leading to unjustified confidence in recommendations. Additionally, the predefined question categories can create edge cases where cross-category questions receive incomplete analysis.' },
  { type: 'paragraph', content: 'Real estate decisions have significant financial implications, making information accuracy a critical ethical concern. This system may present analysis with authoritative language even when based on limited data, potentially influencing investment decisions without adequately communicating uncertainty.' },

  { type: 'heading', content: 'Ethical Considerations' },
  { type: 'paragraph', content: 'The historical database may contain implicit biases related to property valuation or neighborhood characteristics that this system could propagate or amplify, particularly in markets with histories of discriminatory practices. Without explicit guardrails in prompts regarding sensitive demographic or neighborhood characterizations, the system risks perpetuating these biases.' },
  { type: 'paragraph', content: 'The focus on investment metrics across all response types emphasizes financial optimization over broader social considerations, including affordable housing impacts. A more balanced approach would contextualize investment advice within the social aspects of real estate development and acknowledge data limitations more transparently to support responsible decision-making.' },
  { type: 'paragraph', content: 'The added information from the web search may introduce false information that can damage a property\'s reputation or value.' },
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
        
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">Prompting Strategy Reflection</h1>
          
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