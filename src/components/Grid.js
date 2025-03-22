'use client'
import Link from 'next/link';

const Grid = () => {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Market Trends */}
        <Link href="/map" className="block transform transition-transform hover:scale-105">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-80">
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-white mb-3">Properties Mapped (GenAI Feature)</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Properties data plotted on a map for visual analysis
              </p>
            </div>
          </div>
        </Link>

        {/* Area by Submarket */}
        <Link href="/area" className="block transform transition-transform hover:scale-105">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-80">
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-white mb-3">Area by Submarket</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                {/* Updated to pie chart SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 2a10 10 0 0110 10M12 2v10h10" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 12l-6 6" />
                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Analyze area distribution by submarkets with interactive filters
              </p>
            </div>
          </div>
        </Link>

        {/* Year Built Distribution */}
        <Link href="/year_built" className="block transform transition-transform hover:scale-105">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-80">
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-white mb-3">Year Built Distribution</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Analyze the age distribution of properties in the portfolio
              </p>
            </div>
          </div>
        </Link>

        {/* Property Value Analysis */}
        <Link href="/values" className="block transform transition-transform hover:scale-105">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-80">
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-white mb-3">Property Rent Analysis</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                {/* Updated to a line graph SVG */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {/* Horizontal axis */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 20h18" />
                  {/* Vertical axis */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v16" />
                  {/* Line graph trend */}
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4-6 4 2 4-4 4-4" />

                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Review property Rent Growth patterns
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Grid;