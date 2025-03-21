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

        {/* City-wise Lease Up Time */}
        <Link href="/analytics" className="block transform transition-transform hover:scale-105">
          <div className="bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-80">
            <div className="p-6 flex flex-col h-full">
              <h3 className="text-2xl font-bold text-white mb-3">City-wise Lease Up Time</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11v6m0 0l-3-3m3 3l3-3" />
                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Compare lease-up times across different metropolitan areas
              </p>
            </div>
          </div>
        </Link>

        {/* Year Built Distribution */}
        <Link href="/trends" className="block transform transition-transform hover:scale-105">
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
              <h3 className="text-2xl font-bold text-white mb-3">Property Value Analysis</h3>
              <div className="flex-grow bg-gray-800 rounded-lg flex items-center justify-center p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-300 mt-3">
                Review property valuations and investment metrics
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Grid;