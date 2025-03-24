'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Label 
} from 'recharts';
import { createClient } from '@/utils/supabase/client';

export default function TimeSeries() {
  const supabase = createClient();
  
  // States for data management
  const [rentData, setRentData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Available filters for dropdown options
  const [availableFilters, setAvailableFilters] = useState({
    cities: [],
    states: [],
    submarkets: []
  });
  
  // User selected filters
  const [filters, setFilters] = useState({
    city: 'all',
    state: 'all',
    submarket: 'all',
    metric: 'absolute',         // 'absolute', 'yoy', 'growth_since_2008'
    yearRange: [2008, 2020]     // Default year range
  });
  
  // The years available in the dataset
  const availableYears = useMemo(() => {
    return Array.from({ length: 13 }, (_, i) => 2008 + i);
  }, []);
  
  // Load filter options on component mount
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const { data, error } = await supabase
          .from('rent_growth')
          .select('City, State, Submarket')
          .limit(1000);
          
        if (error) throw error;
        
        // Extract unique values
        const uniqueCities = [...new Set(data.map(item => item.City).filter(Boolean))];
        const uniqueStates = [...new Set(data.map(item => item.State).filter(Boolean))];
        const uniqueSubmarkets = [...new Set(data.map(item => item.Submarket).filter(Boolean))];
        
        setAvailableFilters({
          cities: uniqueCities.sort(),
          states: uniqueStates.sort(),
          submarkets: uniqueSubmarkets.sort()
        });
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError('Failed to load filter options');
      }
    }
    
    fetchFilterOptions();
  }, []);
  
  // Fetch data whenever filters change
  useEffect(() => {
    async function fetchRentData() {
      setLoading(true);
      
      try {
        // Build the query based on selected filters
        let query = supabase
          .from('rent_growth')
          .select('property_id, Name, Submarket, City, State, "2008", "2009", "2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020"');
        
        // Apply filters
        if (filters.city !== 'all') {
          query = query.eq('City', filters.city);
        }
        
        if (filters.state !== 'all') {
          query = query.eq('State', filters.state);
        }
        
        if (filters.submarket !== 'all') {
          query = query.eq('Submarket', filters.submarket);
        }
        
        // Execute the query
        const { data, error } = await query;
        
        if (error) throw error;
        
        setRentData(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching rent data:', err);
        setError('Failed to load rent data');
        setLoading(false);
      }
    }
    
    fetchRentData();
  }, [filters.city, filters.state, filters.submarket]);
  
  // Transform the fetched data into time series format whenever raw data or metric changes
  useEffect(() => {
    if (rentData.length === 0) {
      setTimeSeriesData([]);
      return;
    }
    
    // Get the years within the selected range
    const yearsToInclude = availableYears.filter(
      year => year >= filters.yearRange[0] && year <= filters.yearRange[1]
    );
    
    // Process the data based on the selected metric
    if (filters.metric === 'absolute') {
      // Absolute rent values
      const timeSeriesPoints = yearsToInclude.map(year => {
        const yearString = year.toString();
        const propertiesWithData = rentData.filter(property => 
          property[yearString] !== null && 
          property[yearString] !== "Property not leased yet" &&
          !isNaN(parseFloat(property[yearString]))
        );
        
        const avgRent = propertiesWithData.length > 0
          ? propertiesWithData.reduce((sum, property) => sum + parseFloat(property[yearString]), 0) / propertiesWithData.length
          : 0;
          
        return {
          year,
          value: avgRent,
          propertyCount: propertiesWithData.length
        };
      }).filter(point => point.propertyCount > 0);
      
      setTimeSeriesData(timeSeriesPoints);
    } 
    else if (filters.metric === 'yoy') {
      // Year-over-year growth
      const timeSeriesPoints = [];
      
      for (let i = 1; i < yearsToInclude.length; i++) {
        const currentYear = yearsToInclude[i].toString();
        const previousYear = yearsToInclude[i-1].toString();
        
        const propertiesWithDataBothYears = rentData.filter(property => 
          property[currentYear] !== null && 
          property[currentYear] !== "Property not leased yet" &&
          property[previousYear] !== null && 
          property[previousYear] !== "Property not leased yet" &&
          !isNaN(parseFloat(property[currentYear])) &&
          !isNaN(parseFloat(property[previousYear])) &&
          parseFloat(property[previousYear]) > 0
        );
        
        if (propertiesWithDataBothYears.length > 0) {
          // Calculate YoY growth for each property, then average
          const totalYoYGrowth = propertiesWithDataBothYears.reduce((sum, property) => {
            const currentRent = parseFloat(property[currentYear]);
            const previousRent = parseFloat(property[previousYear]);
            const growthRate = ((currentRent - previousRent) / previousRent) * 100;
            return sum + growthRate;
          }, 0);
          
          const avgYoYGrowth = totalYoYGrowth / propertiesWithDataBothYears.length;
          
          timeSeriesPoints.push({
            year: parseInt(currentYear),
            value: avgYoYGrowth,
            propertyCount: propertiesWithDataBothYears.length
          });
        }
      }
      
      setTimeSeriesData(timeSeriesPoints);
    }
    else if (filters.metric === 'growth_since_2008') {
      // Cumulative growth since 2008 (or first year in range)
      const baseYear = yearsToInclude[0].toString();
      const timeSeriesPoints = [];
      
      for (let i = 0; i < yearsToInclude.length; i++) {
        const currentYear = yearsToInclude[i].toString();
        
        const propertiesWithDataBothYears = rentData.filter(property => 
          property[currentYear] !== null && 
          property[currentYear] !== "Property not leased yet" &&
          property[baseYear] !== null && 
          property[baseYear] !== "Property not leased yet" &&
          !isNaN(parseFloat(property[currentYear])) &&
          !isNaN(parseFloat(property[baseYear])) &&
          parseFloat(property[baseYear]) > 0
        );
        
        if (propertiesWithDataBothYears.length > 0) {
          // Calculate cumulative growth for each property, then average
          const totalCumulativeGrowth = propertiesWithDataBothYears.reduce((sum, property) => {
            const currentRent = parseFloat(property[currentYear]);
            const baseRent = parseFloat(property[baseYear]);
            const growthRate = ((currentRent - baseRent) / baseRent) * 100;
            return sum + growthRate;
          }, 0);
          
          const avgCumulativeGrowth = totalCumulativeGrowth / propertiesWithDataBothYears.length;
          
          timeSeriesPoints.push({
            year: parseInt(currentYear),
            value: avgCumulativeGrowth,
            propertyCount: propertiesWithDataBothYears.length
          });
        }
      }
      
      setTimeSeriesData(timeSeriesPoints);
    }
  }, [rentData, filters.metric, filters.yearRange]);
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };
  
  // Handle year range changes
  const handleYearRangeChange = (start, end) => {
    setFilters(prev => ({
      ...prev,
      yearRange: [parseInt(start), parseInt(end)]
    }));
  };
  
  // Determine chart label and formatting based on selected metric
  const metricConfig = useMemo(() => {
    switch(filters.metric) {
      case 'absolute':
        return {
          label: 'Average Rent ($)',
          format: (value) => `$${value.toFixed(0)}`,
          color: '#f59e0b'
        };
      case 'yoy':
        return {
          label: 'Year-over-Year Growth (%)',
          format: (value) => `${value.toFixed(2)}%`,
          color: '#10b981'
        };
      case 'growth_since_2008':
        return {
          label: `Cumulative Growth Since ${filters.yearRange[0]} (%)`,
          format: (value) => `${value.toFixed(2)}%`,
          color: '#4f46e5'
        };
      default:
        return {
          label: 'Value',
          format: (value) => value.toFixed(2),
          color: '#f59e0b'
        };
    }
  }, [filters.metric, filters.yearRange]);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (timeSeriesData.length === 0) return null;
    
    const latestValue = timeSeriesData[timeSeriesData.length - 1].value;
    const averageValue = timeSeriesData.reduce((sum, item) => sum + item.value, 0) / timeSeriesData.length;
    const totalProperties = timeSeriesData.reduce((sum, item) => sum + item.propertyCount, 0);
    const startYear = timeSeriesData[0].year;
    const endYear = timeSeriesData[timeSeriesData.length - 1].year;
    
    return {
      latestValue,
      averageValue,
      totalProperties,
      startYear,
      endYear,
      totalYears: timeSeriesData.length
    };
  }, [timeSeriesData]);
  
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
            <option value="absolute">Average Rent</option>
            <option value="yoy">Year-over-Year Growth</option>
            <option value="growth_since_2008">Cumulative Growth</option>
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Start Year</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.yearRange[0]}
            onChange={(e) => handleYearRangeChange(e.target.value, filters.yearRange[1])}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">End Year</label>
          <select 
            className="w-full bg-gray-800 text-white rounded border border-gray-700 p-2"
            value={filters.yearRange[1]}
            onChange={(e) => handleYearRangeChange(filters.yearRange[0], e.target.value)}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
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
              data={timeSeriesData}
              margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey="year" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                type="number"
                domain={['dataMin', 'dataMax']}
                allowDecimals={false}
              >
                <Label 
                  value="Year" 
                  position="insideBottom" 
                  offset={-10}
                  fill="#9ca3af"
                />
              </XAxis>
              <YAxis 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                domain={filters.metric === 'absolute' ? [0, 'auto'] : ['auto', 'auto']}
                tickFormatter={(value) => {
                  return metricConfig.format(value);
                }}
              >
                <Label 
                  value={metricConfig.label}
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle', fill: '#9ca3af' }}
                />
              </YAxis>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', color: '#fff', border: '1px solid #374151' }}
                formatter={(value) => [metricConfig.format(value), 'Value']}
                labelFormatter={(year) => {
                  const item = timeSeriesData.find(d => d.year === year);
                  return item ? `${year} (${item.propertyCount} properties)` : year;
                }}
              />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={metricConfig.color}
                strokeWidth={2}
                dot={{ r: 3, fill: metricConfig.color }}
                activeDot={{ r: 6 }}
                name={metricConfig.label}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Summary stats */}
      {!loading && summaryStats && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Latest Value</h3>
            <p className="text-xl font-bold text-white">
              {metricConfig.format(summaryStats.latestValue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Year {summaryStats.endYear}
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Average</h3>
            <p className="text-xl font-bold text-white">
              {metricConfig.format(summaryStats.averageValue)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Period Average
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Properties Analyzed</h3>
            <p className="text-xl font-bold text-white">
              {rentData.length}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Matching Filter Criteria
            </p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Time Range</h3>
            <p className="text-xl font-bold text-white">
              {summaryStats.totalYears} years
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {summaryStats.startYear} to {summaryStats.endYear}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}