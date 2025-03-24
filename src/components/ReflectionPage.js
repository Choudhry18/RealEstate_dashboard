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
    { type: 'paragraph', content: 'The multi-agent prompting architecture with specialized prompts for different question types (FACT, COMPARISON, INVESTMENT, MARKET) enables more nuanced and accurate responses tailored to specific user needs. Each prompt template contains carefully designed instructions that guide the AI to focus on relevant data points and produce structured responses with consistent formatting.' },
    { type: 'paragraph', content: 'By incorporating dynamic data retrieval from the Supabase database directly into prompts, the system grounds its responses in factual property information rather than hallucinating details. The question classification step intelligently routes queries to the appropriate specialized agent, ensuring users receive optimized responses without needing to specify the question type themselves.' },
    { type: 'paragraph', content: 'The inclusion of web search capability for market and investment questions allows the system to supplement internal database information with current market trends and economic data, keeping responses fresh and relevant. Response templates with bullet points, numerical highlighting, and consistent structures make insights more digestible and actionable for users.' },
    
    { type: 'heading', content: 'Prompting Strategy Limitations' },
    { type: 'paragraph', content: 'Despite specialized prompts, the language model occasionally produces overly confident assertions when data is sparse, as rigid formatting instructions may compel the model to generate insights even with insufficient information. The categorization of questions into four predefined types can create edge cases where questions that span multiple categories receive less comprehensive treatment.' },
    { type: 'paragraph', content: 'Web search augmentation works inconsistently across different query types and locations, with smaller or less documented markets receiving fewer relevant search results to incorporate. The prompting system struggles with complex temporal questions that require understanding property performance across multiple time periods, as the templates don\'t fully support multi-dimensional time-based analysis.' },
    { type: 'paragraph', content: 'When property-specific data is missing, the system falls back to submarket averages without clearly communicating this substitution to users, potentially creating false impressions of data specificity. The citation formatting in web search responses occasionally breaks when sources contain special characters or when results are paginated.' },
    
    { type: 'heading', content: 'Ethical Considerations in Prompt Design' },
    { type: 'paragraph', content: 'The prompts contain minimal guidance on avoiding potentially sensitive or discriminatory statements about neighborhoods or demographics, risking the perpetuation of biases in property valuation. By formatting responses with confident, authoritative language, the system may overstate certainty and underplay limitations in the underlying data, potentially misleading users.' },
    { type: 'paragraph', content: 'The web search capability lacks sufficient guardrails to prevent the citation of unreliable sources, potentially amplifying misinformation about property markets. While the system carefully structured response formats for readability, it could more explicitly acknowledge when it\'s making projections versus stating facts to promote more responsible decision-making.' },
    { type: 'paragraph', content: 'The integration of rent history data across all response types brings attention to financial metrics that may emphasize profit optimization over community impacts or affordable housing considerations. A more balanced prompt design could encourage contextualizing investment advice within broader social considerations of real estate development.' },
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