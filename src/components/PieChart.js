'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { MdFilterList } from 'react-icons/md';
import { IoMdRefresh } from 'react-icons/io';
import dynamic from 'next/dynamic';

// Import Select component with dynamic import and SSR disabled
const Select = dynamic(() => import('react-select'), { ssr: false });

// Colorful palette for pie slices
const COLORS = [
  '#4F46E5', '#3B82F6', '#0EA5E9', '#06B6D4', '#14B8A6', 
  '#10B981', '#22C55E', '#84CC16', '#EAB308', '#F59E0B',
  '#F97316', '#EF4444', '#EC4899', '#D946EF', '#8B5CF6'
];

export default function SubmarketPieChart() {
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);
  
  // Filter options
  const [cities, setCities] = useState([]);
  const [states, setStates] = useState([]); // Changed from propertyTypes
  const [unitRanges, setUnitRanges] = useState([
    { value: 'all', label: 'All Units' },
    { value: 'small', label: '< 50 Units' },
    { value: 'medium', label: '50-200 Units' },
    { value: 'large', label: '> 200 Units' }
  ]);
  
  // Filter selections
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedState, setSelectedState] = useState(null); // Changed from selectedPropertyType
  const [selectedUnitRange, setSelectedUnitRange] = useState({ value: 'all', label: 'All Units' });
          // Store the true submarket count
  const [submarketCount, setSubmarketCount] = useState();
  // Set client-side rendering flag
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Fetch filter options
  useEffect(() => {
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
        
        // Fetch states instead of property types
        const { data: stateData } = await supabase
        .from('properties')
        .select('state')
        .not('state', 'is', null);
        
        if (stateData) {
          const uniqueTypes = [...new Set(stateData.map(item => item.state))]
            .filter(Boolean)
            .sort()
            .map(state => ({ value: state, label: state }));
          setStates(uniqueTypes);
        }
      } catch (err) {
        console.error('Error fetching filter options:', err);
        setError('Failed to load filter options');
      }
    }
    
    fetchFilterOptions();
  }, [isClient]);
  
  // Fetch data based on selected filters
  useEffect(() => {
    if (!isClient) return;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      
      // Build query
      let query = supabase
        .from('properties')
        .select('submarket, area_per_unit , quantity', 'city')
        .not('submarket', 'is', null);
      
      // Apply filters
      if (selectedCity) {
        query = query.eq('city', selectedCity.value);
      }
      
      if (selectedState) {
        query = query.eq('state', selectedState.value);
    }
      
      // Unit range filtering
      if (selectedUnitRange && selectedUnitRange.value !== 'all') {
        switch (selectedUnitRange.value) {
          case 'small':
            query = query.lt('quantity', 50);
            break;
          case 'medium':
            query = query.gte('quantity', 50).lt('quantity', 200);
            break;
          case 'large':
            query = query.gte('quantity', 200);
            break;
        }
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
        
        // Group data by submarket
        const submarketData = {};
        
        data.forEach(property => {
          if (!property.submarket) return;
          
          const submarket = property.submarket;
          const squareFootage = parseFloat(property.area_per_unit) || 0;
          
          if (!submarketData[submarket]) {
            submarketData[submarket] = {
              name: submarket,
              value: 0,
              properties: 0
            };
          }
          
          submarketData[submarket].value += squareFootage;
          submarketData[submarket].properties += 1;
        });
        
        // Convert to array and sort by value (descending)
        const chartData = Object.values(submarketData)
          .map(item => ({
            ...item,
            value: Math.round(item.value) // Round to whole number
          }))
          .sort((a, b) => b.value - a.value);
        
        let totalSubmarketCount = chartData.length; // Store the true count before grouping

        // Take top 10 and group the rest as "Other"
        if (chartData.length > 10) {
          const topTen = chartData.slice(0, 9);
          const others = chartData.slice(9);
          
          const otherTotal = others.reduce((sum, item) => sum + item.value, 0);
          const otherProperties = others.reduce((sum, item) => sum + item.properties, 0);
          
          topTen.push({
            name: 'Other Submarkets',
            value: otherTotal,
            properties: otherProperties,
            groupedCount: others.length // Store how many submarkets are grouped

          });
          
          setData(topTen);
        } else {
          setData(chartData);
        }
        // Store the true submarket count
        // Add to the useEffect
        setSubmarketCount(totalSubmarketCount);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching submarket data:', err);
        setError('Failed to load property data');
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedCity, selectedState, selectedUnitRange, isClient]);
  
  const resetFilters = () => {
    setSelectedCity(null);
    setSelectedState(null);;
    setSelectedUnitRange({ value: 'all', label: 'All Units' });
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
      zIndex: 9999,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#475569', // slate-600
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1e293b', // slate-800
    }),
      // Add styling for dropdown options
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? 'white' : '#1e293b', // Dark text for unselected options
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : null,
    fontWeight: state.isSelected ? 500 : 400,
    padding: '8px 12px',
  }),
  };
  
  // Format large numbers with commas
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Calculate total area
  const totalArea = data.reduce((sum, item) => sum + item.value, 0);
  
  // Show placeholder during server-side rendering
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
          <h2 className="text-2xl font-bold text-slate-900">Area Distribution by Submarket</h2>
          
          <button 
            onClick={resetFilters}
            className="flex items-center text-blue-600 hover:text-blue-800 hover:cursor-pointer"
            title="Reset Filters"
          >
            <IoMdRefresh className="mr-1" />
            Reset
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-y-2">
          <div className="flex items-center mr-2">
            <MdFilterList className="text-slate-700" />
            <span className="text-sm text-slate-700 font-medium ml-1">Filters:</span>
          </div>
          
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
            placeholder="State" // Changed from "Property Type"
            options={states} // Changed from propertyTypes
            value={selectedState} // Changed from selectedPropertyType
            onChange={setSelectedState} // Changed from setSelectedPropertyType
            styles={customStyles}
            className="min-w-[150px]"
            />
          
          <Select
            placeholder="Unit Range"
            options={unitRanges}
            value={selectedUnitRange}
            onChange={setSelectedUnitRange}
            styles={customStyles}
            className="min-w-[150px]"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-80 flex items-center justify-center">
          <p className="text-slate-700 font-medium">No data available for the selected filters</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  paddingAngle={2}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${formatNumber(value)} sq ft`, 'Area']}
                  contentStyle={{ 
                    backgroundColor: '#f8fafc', 
                    borderColor: '#cbd5e1',
                    color: '#1e293b' 
                  }}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="w-full md:w-1/2 pl-0 md:pl-8 mt-4 md:mt-0">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Summary</h3>
              
              <div className="mb-4">
                <p className="text-slate-600">Total Area: <span className="font-semibold text-slate-800">{formatNumber(totalArea)} sq ft</span></p>
                <p className="text-slate-600">Number of Submarkets: <span className="font-semibold text-slate-800">{submarketCount}</span></p>
                <p className="text-slate-600">Total Properties: <span className="font-semibold text-slate-800">
                  {formatNumber(data.reduce((sum, item) => sum + item.properties, 0))}
                </span></p>
              </div>
              
              <h4 className="text-md font-semibold text-slate-800 mb-2">Top Submarkets</h4>
              <div className="max-h-40 overflow-y-auto pr-2">
                {data.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <span className="text-slate-700">{item.name}</span>
                    <div className="flex flex-col items-end">
                      <span className="font-medium text-slate-800">{formatNumber(item.value)} sq ft</span>
                      <span className="text-xs text-slate-500">{((item.value / totalArea) * 100).toFixed(1)}% of total</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 text-sm text-slate-700">
              <p>
                {selectedCity || selectedState || (selectedUnitRange && selectedUnitRange.value !== 'all') ? (
                  <span>
                    Filtered by: {[
                      selectedCity && `City: ${selectedCity.label}`,
                      selectedState && `State: ${selectedState.label}`,
                      selectedUnitRange && selectedUnitRange.value !== 'all' && `Units: ${selectedUnitRange.label}`
                    ].filter(Boolean).join(', ')}
                  </span>
                ) : (
                  'Showing distribution of total area across all submarkets'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}