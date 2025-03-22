'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import Link from 'next/link';

export default function Reflection() {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Define reflection content with headings as HTML
  const reflectionContent = [    
    { type: 'heading', content: 'Advantages' },
    { type: 'paragraph', content: 'By combining specific property data with comparative information from similar properties, the system provides nuanced insights tailored to each property\'s unique characteristics and market position. The solution can respond to a wide range of user questions without requiring pre-defined response templates, making it adaptable to diverse user needs.' },
    { type: 'paragraph', content: 'Rather than offering generic advice, the system grounds its analysis in real property data, providing quantitative comparisons that help users make informed decisions. The architecture separates AI processing from the frontend, making it easier to enhance the model, add data sources, or optimize performance without major UI changes. The formatting guidelines ensure consistent, readable responses that highlight key metrics while maintaining a conversational tone.' },
    
    { type: 'heading', content: 'Limitations' },
    { type: 'paragraph', content: 'The quality of insights is directly tied to the available data. Missing or inaccurate property information significantly degrades response quality. While the system can analyze provided data, it lacks broader market knowledge such as neighborhood development plans, local economic trends, or regulatory changes that might impact property value.' },
    { type: 'paragraph', content: 'AI underlying language model tend to hallucinate, so occasionally the produce confident-sounding statements that extrapolate beyond the available data, potentially misleading users. The current implementation provides point-in-time analysis rather than tracking property performance over time, limiting its predictive capabilities.' },
    
    { type: 'heading', content: 'Ethical Considerations' },
    { type: 'paragraph', content: 'In correct information produced by GenAI about a property can be damaging to it\'s reputation. Even with anonymized property data, the system could potentially reveal sensitive information about property owners or tenants, raising privacy concerns. If the property database contains historical biases (e.g., undervalued properties in certain neighborhoods), the AI might perpetuate these biases in its analyses.' },
    { type: 'paragraph', content: 'Users might place excessive trust in AI-generated insights, potentially making significant financial decisions without appropriate human judgment or expertise. The technology could create information asymmetries, giving technologically-savvy users advantages in real estate transactions over those with limited tech access. The "black box" nature of complex language models makes it difficult for users to understand how specific conclusions were reached, undermining informed decision-making.' },

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