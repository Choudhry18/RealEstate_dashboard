'use client'

const Grid = () => {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Dashboard Visualizations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Example visualization placeholders */}
          <div className="bg-white p-4 shadow-lg rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Market Trends</h3>
            <div className="h-40 bg-gray-200 rounded-md flex items-center justify-center">Chart Placeholder</div>
          </div>
          <div className="bg-white p-4 shadow-lg rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">City-wise Lease Up Time</h3>
            <div className="h-40 bg-gray-200 rounded-md flex items-center justify-center">Chart Placeholder</div>
          </div>
          <div className="bg-white p-4 shadow-lg rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Year Built Distribution</h3>
            <div className="h-40 bg-gray-200 rounded-md flex items-center justify-center">Chart Placeholder</div>
          </div>
          {/* Add more visualizations here */}
        </div>
      </div>
    );
  };
  
  export default Grid;
  