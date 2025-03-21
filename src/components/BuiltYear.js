'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Brush 
} from 'recharts';
import { MdFilterList } from 'react-icons/md';
import { IoMdRefresh } from 'react-icons/io';
import dynamic from 'next/dynamic';

// Import Select component with dynamic import and SSR disabled
const Select = dynamic(() => import('react-select'), { ssr: false });

export default function YearBuiltHistogram() {
  // Initial empty states
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]);
  const [submarkets, setSubmarkets] = useState([]);
  const [levels, setLevels] = useState([]);
  
  // Selected filter values
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedSubmarket, setSelectedSubmarket] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  
  // Client-side only initialization
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Load filter options on component mount
  useEffect(() => {
    // Skip if not client-side yet
    if (!isClient) return;
    
    async function fetchFilterOptions() {
      const supabase = createClient();
      
      try {
        // Fetch cities
        const { data: cityData } = await supabase
          .from('properties')
          .select('city')
          .not('city', 'is', null);
        
        if (cityData) {
          const uniqueCities = [...new Set(cityData.map(item => item.city))]
            .filter(Boolean)
            .sort()
            .map(city => ({ value: city, label: city }));
          setCities(uniqueCities);
        }
        
        // Fetch states
        const { data: stateData } = await supabase
          .from('properties')
          .select('state')
          .not('state', 'is', null);
        
        if (stateData) {
          const uniqueStates = [...new Set(stateData.map(item => item.state))]
            .filter(Boolean)
            .sort()
            .map(state => ({ value: state, label: state }));
          setStates(uniqueStates);
        }
        
        // Fetch submarkets
        const { data: submarketData } = await supabase
          .from('properties')
          .select('submarket')
          .not('submarket', 'is', null);
        
        if (submarketData) {
          const uniqueSubmarkets = [...new Set(submarketData.map(item => item.submarket))]
            .filter(Boolean)
            .sort()
            .map(submarket => ({ value: submarket, label: submarket }));
          setSubmarkets(uniqueSubmarkets);
        }
        
        // Fetch levels
        const { data: levelData } = await supabase
          .from('properties')
          .select('level')
          .not('level', 'is', null);
        
        if (levelData) {
          const uniqueLevels = [...new Set(levelData.map(item => item.level))]
            .filter(Boolean)
            .sort()
            .map(level => ({ value: level, label: level }));
          setLevels(uniqueLevels);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError('Failed to load filter options');
      }
    }
    
    fetchFilterOptions();
  }, [isClient]);
  
  // Fetch data based on filters
  useEffect(() => {
    // Skip if not client-side yet
    if (!isClient) return;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      // Build query
      let query = supabase
        .from('properties')
        .select('year_built')
        .not('year_built', 'is', null);
      
      // Apply filters
      if (selectedCity) {
        query = query.eq('city', selectedCity.value);
      }
      
      if (selectedState) {
        query = query.eq('state', selectedState.value);
      }
      
      if (selectedSubmarket) {
        query = query.eq('submarket', selectedSubmarket.value);
      }
      
      if (selectedLevel) {
        query = query.eq('level', selectedLevel.value);
      }
      
      try {
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        if (!data || data.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }
        
        // Group by year built
        const yearCounts = {};
        const currentYear = new Date().getFullYear();
        
        data.forEach(property => {
          const year = parseInt(property.year_built);
          
          // Validate year (between 1800 and current year)
          if (isNaN(year) || year < 1800 || year > currentYear) {
            return;
          }
          
          if (!yearCounts[year]) {
            yearCounts[year] = 0;
          }
          
          yearCounts[year]++;
        });
        
        // Fill in gaps for years with no properties
        const years = Object.keys(yearCounts).map(Number);
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        
        const histogramData = [];
        
        // Group by decades for better visualization
        const decades = {};
        
        for (let year = minYear; year <= maxYear; year++) {
          const decade = Math.floor(year / 10) * 10;
          
          if (!decades[decade]) {
            decades[decade] = 0;
          }
          
          decades[decade] += yearCounts[year] || 0;
        }
        
        // Convert to array format for chart
        Object.keys(decades).forEach(decade => {
          histogramData.push({
            decade: `${decade}s`,
            count: decades[decade]
          });
        });
        
        setData(histogramData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching year built data:', err);
        setError('Failed to load property data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedCity, selectedState, selectedSubmarket, selectedLevel, isClient]);
  
  const resetFilters = () => {
    setSelectedCity(null);
    setSelectedState(null);
    setSelectedSubmarket(null);
    setSelectedLevel(null);
  };
  
  const customStyles = {
    control: (provided) => ({
      ...provided,
      minWidth: 180,
      margin: '0 8px',
      fontSize: '14px',
    }),
    menu: (provided) => ({
      ...provided,
      color: '#475569',
      zIndex: 9999,
    }),
  };
  
  // Show placeholder while on server or hydrating
  if (!isClient) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-lg">
        <div className="h-80 flex items-center justify-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-9000">Year Built Distribution</h2>
          
          <button 
            onClick={resetFilters}
            className="flex items-center text-blue-600 hover:text-blue-800"
            title="Reset Filters"
          >
            <IoMdRefresh className="mr-1" />
            Reset
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-y-2">
          <div className="flex items-center mr-2">
            <MdFilterList className="text-gray-2000" />
            <span className="text-sm text-slate-700 font-medium ml-1">Filters:</span>
          </div>
          
          {isClient && (
            <>
              <Select
                isClearable
                placeholder="City"
                options={cities}
                value={selectedCity}
                onChange={setSelectedCity}
                styles={customStyles}
                className="min-w-[150px]"
              />
              
              <Select
                isClearable
                placeholder="State"
                options={states}
                value={selectedState}
                onChange={setSelectedState}
                styles={customStyles}
                className="min-w-[150px]"
              />
              
              <Select
                isClearable
                placeholder="Submarket"
                options={submarkets}
                value={selectedSubmarket}
                onChange={setSelectedSubmarket}
                styles={customStyles}
                className="min-w-[150px]"
              />
              
              <Select
                isClearable
                placeholder="Level"
                options={levels}
                value={selectedLevel}
                onChange={setSelectedLevel}
                styles={customStyles}
                className="min-w-[150px]"
              />
            </>
          )}
        </div>
      </div>
      
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">No data available for the selected filters</p>
        </div>
      ) : (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 10, bottom: 50 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="decade" 
                label={{ 
                  value: 'Year Built (by decade)', 
                  position: 'insideBottom', 
                  offset: -30 
                }}
                angle={-45}
                textAnchor="end"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                label={{ 
                  value: 'Properties Built', 
                  angle: -90, 
                  position: 'insideLeft' 
                }} 
              />
              <Tooltip 
                formatter={(value) => [`${value} properties`, 'Count']}
                labelFormatter={(label) => `Built in: ${label}`}
              />
              <Legend verticalAlign="top" height={36} />
              <Bar 
                dataKey="count" 
                name="Properties Built" 
                fill="#4F46E5" 
                radius={[4, 4, 0, 0]}
              />
            <Brush 
            dataKey="decade" 
            height={30} 
            stroke="#8884d8"
            x={50}
            y={280}  /* Position the brush lower */
            travellerWidth={10}
            fill="#f5f5f5"
            />            </BarChart>
          </ResponsiveContainer>
          
        </div>
      )}
    </div>
  );
}