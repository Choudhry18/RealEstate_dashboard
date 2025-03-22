'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Label 
} from 'recharts';
import { createClient } from '@/utils/supabase/client';

export default function TimeSeries() {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    city: 'all',
    state: 'all',
    submarket: 'all',
    metric: 'YoY_Growth', // Default to Year-over-Year growth
    startDate: '2008-01-01', // Default start date
    endDate: '2020-12-31'    // Default end date
  });
  
  const [availableFilters, setAvailableFilters] = useState({
    cities: [],
    states: [],
    submarkets: []
  });
  
  const supabase = createClient();
  
  // Fetch filter options when component mounts
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        // Just get all records with limit and extract unique values in JavaScript
        const { data, error } = await supabase
          .from('rent_time_series')
          .select('city, state, submarket')
          .limit(5000); // Limit to avoid fetching too much data
        
        if (error) throw error;
        
        // Use JavaScript to extract unique values
        const uniqueCities = [...new Set(data.map(item => item.city).filter(Boolean))];
        const uniqueStates = [...new Set(data.map(item => item.state).filter(Boolean))];
        const uniqueSubmarkets = [...new Set(data.map(item => item.submarket).filter(Boolean))];
        
        setAvailableFilters({
          cities: uniqueCities.sort(),
          states: uniqueStates.sort(),
          submarkets: uniqueSubmarkets.sort()
        });
      } catch (error) {
        console.error('Error fetching filter options:', error);
        setError('Failed to load filter options');
      }
    }
    
    fetchFilterOptions();
  }, []);
  
  // Fetch time series data when filters change
  useEffect(() => {
    async function fetchTimeSeriesData() {
      setLoading(true);
      
      try {
        // Build the query
        let query = supabase
          .from('rent_time_series')
          .select('date, city, state, submarket, yoy_growth, mom_growth, rent');
        
        // Apply filters
        if (filters.city !== 'all') {
          query = query.eq('city', filters.city);
        }
        
        if (filters.state !== 'all') {
          query = query.eq('state', filters.state);
        }
        
        if (filters.submarket !== 'all') {
          query = query.eq('submarket', filters.submarket);
        }
        
        // Apply date range filters
        if (filters.startDate) {
          query = query.gte('date', filters.startDate);
        }
        
        if (filters.endDate) {
          query = query.lte('date', filters.endDate);
        }
        
        // Order by date
        query = query.order('date', { ascending: true });
        
        // Limit results to prevent performance issues
        query = query.limit(10000);
        
        const { data, error } = await query;
        
        // Add more debugging
        console.log("Data range:", data && data.length ? 
          `From ${data[0].date} to ${data[data.length-1].date}, ${data.length} records total` : 
          "No data available");
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          setTimeSeriesData([]);
          setLoading(false);
          return;
        }
        
        // Process data for visualization
        // Group by date and calculate averages for each date
        const groupedByDate = data.reduce((acc, record) => {
          if (!record.date) return acc; // Skip records with no date
          
          // Use lowercase field names to match the received data
          const date = record.date.substring(0, 7); // Get YYYY-MM format
          
          if (!acc[date]) {
            acc[date] = {
              date,
              count: 0,
              totalYoY: 0,
              totalMoM: 0,
              totalRent: 0
            };
          }
          
          // Only include records with valid growth numbers
          if (record.yoy_growth !== null && !isNaN(record.yoy_growth)) {
            acc[date].totalYoY += parseFloat(record.yoy_growth) || 0;
            acc[date].count++;
          }
          
          if (record.mom_growth !== null && !isNaN(record.mom_growth)) {
            acc[date].totalMoM += parseFloat(record.mom_growth) || 0;
          }
          
          if (record.rent !== null && !isNaN(record.rent)) {
            acc[date].totalRent += parseFloat(record.rent) || 0;
          }
          
          return acc;
        }, {});
        
        // Check if we have any valid data points
        if (Object.keys(groupedByDate).length === 0) {
          setTimeSeriesData([]);
          setLoading(false);
          return;
        }
        
        // Calculate averages with correct field names for output
        const timeSeriesArray = Object.values(groupedByDate)
          .filter(group => group.count > 0) // Only include dates with data
          .map(group => ({
            date: group.date,
            YoY_Growth: group.totalYoY / group.count,
            MoM_Growth: group.totalMoM / group.count,
            Rent: group.totalRent / group.count,
            propertyCount: group.count
          }));
        
        console.log(`Processed ${timeSeriesArray.length} data points for time series`);
        
        setTimeSeriesData(timeSeriesArray);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching time series data:', error);
        setError('Failed to load time series data');
        setLoading(false);
      }
    }
    
    fetchTimeSeriesData();
  }, [filters]);
  
  // Format data for display
  const formattedData = useMemo(() => {
    return timeSeriesData.map(item => ({
      ...item,
      tooltipDate: new Date(`${item.date}-01`).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      }),
      // Format percentages for display - making sure to handle potential NaN values
      YoY_Growth: !isNaN(item.YoY_Growth) ? parseFloat(item.YoY_Growth.toFixed(2)) : 0,
      MoM_Growth: !isNaN(item.MoM_Growth) ? parseFloat(item.MoM_Growth.toFixed(2)) : 0,
      Rent: !isNaN(item.Rent) ? parseFloat(item.Rent.toFixed(0)) : 0
    }));
  }, [timeSeriesData]);
  
  // Calculate the color for the line based on the selected metric
  const lineColor = filters.metric === 'YoY_Growth' ? '#4f46e5' : 
                   filters.metric === 'MoM_Growth' ? '#10b981' : '#f59e0b';
  
  // Determine Y-axis label based on selected metric
  const yAxisLabel = filters.metric === 'YoY_Growth' ? 'Year-over-Year Growth (%)' : 
                    filters.metric === 'MoM_Growth' ? 'Month-over-Month Growth (%)' : 
                    'Average Rent ($)';
  
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  // Convert YYYY-MM to readable date for display
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(`${dateStr}-01`); // Add day for valid date parsing
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  
  if (error) {
    return (
      <div className="bg-red-100 text-red-800 p-4 rounded-lg">
        Error: {error}
      </div>
    );
  }
  
  return (
    <div className="bg-gray-900 rounded-xl shadow-xl p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Rent Growth Time Series</h2>
      
      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Metric</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.metric}
            onChange={(e) => handleFilterChange('metric', e.target.value)}
          >
            <option value="YoY_Growth">Year-over-Year Growth</option>
            <option value="MoM_Growth">Month-over-Month Growth</option>
            <option value="Rent">Average Rent</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.state}
            onChange={(e) => handleFilterChange('state', e.target.value)}
          >
            <option value="all">All States</option>
            {availableFilters.states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.city}
            onChange={(e) => handleFilterChange('city', e.target.value)}
          >
            <option value="all">All Cities</option>
            {availableFilters.cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Submarket</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.submarket}
            onChange={(e) => handleFilterChange('submarket', e.target.value)}
          >
            <option value="all">All Submarkets</option>
            {availableFilters.submarkets.map(submarket => (
              <option key={submarket} value={submarket}>{submarket}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
          <input 
            type="date" 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
          <input 
            type="date" 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </div>
      
      {/* Chart area */}
      <div className="h-80 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : timeSeriesData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            No data available for the selected filters
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => {
                  const date = new Date(`${value}-01`); // Add day to make valid date
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: '2-digit' 
                  });
                }}
                minTickGap={30} // Prevent label overcrowding
              >
                <Label 
                  value="Date" 
                  position="insideBottom" 
                  offset={-10}
                  fill="#9ca3af"
                />
              </XAxis>
              <YAxis 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                domain={filters.metric !== 'Rent' ? ['auto', 'auto'] : [0, 'auto']}
                tickFormatter={(value) => {
                  return filters.metric === 'Rent' 
                    ? `$${value}`
                    : `${value}%`;
                }}
              >
                <Label 
                  value={yAxisLabel}
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle', fill: '#9ca3af' }}
                />
              </YAxis>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151' }}
                formatter={(value, name) => {
                  if (name === 'YoY_Growth' || name === 'MoM_Growth') {
                    return [`${value.toFixed(2)}%`, name === 'YoY_Growth' ? 'Year-over-Year Growth' : 'Month-over-Month Growth'];
                  }
                  if (name === 'Rent') {
                    return [`$${value.toFixed(0)}`, 'Average Rent'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => {
                  const item = formattedData.find(d => d.date === label);
                  return item ? `${item.tooltipDate} (${item.propertyCount} properties)` : label;
                }}
              />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Line
                type="monotone"
                dataKey={filters.metric}
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 6 }}
                name={filters.metric === 'YoY_Growth' ? 'Year-over-Year Growth' : 
                      filters.metric === 'MoM_Growth' ? 'Month-over-Month Growth' : 
                      'Average Rent'}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Summary stats */}
      {!loading && timeSeriesData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Latest Value</h3>
            <p className="text-xl font-bold text-white">
              {filters.metric === 'Rent' 
                ? `$${formattedData[formattedData.length - 1][filters.metric].toFixed(0)}`
                : `${formattedData[formattedData.length - 1][filters.metric].toFixed(2)}%`
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDateForDisplay(formattedData[formattedData.length - 1].date)}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Average</h3>
            <p className="text-xl font-bold text-white">
              {filters.metric === 'Rent'
                ? `$${(formattedData.reduce((sum, item) => sum + item[filters.metric], 0) / formattedData.length).toFixed(0)}`
                : `${(formattedData.reduce((sum, item) => sum + item[filters.metric], 0) / formattedData.length).toFixed(2)}%`
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Period Average
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Total Properties</h3>
            <p className="text-xl font-bold text-white">
              {formattedData.reduce((sum, item) => sum + item.propertyCount, 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Across All Datapoints
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Time Range</h3>
            <p className="text-xl font-bold text-white">
              {formattedData.length} months
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDateForDisplay(formattedData[0].date)} to {formatDateForDisplay(formattedData[formattedData.length - 1].date)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}