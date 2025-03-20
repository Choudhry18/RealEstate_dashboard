'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { MdFilterList } from 'react-icons/md';

export default function PropertyChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [propertyType, setPropertyType] = useState('all');
  
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // Build query
      let query = supabase
        .from('properties')
        .select('city, property_type, quantity')
        .not('city', 'is', null);
      
      // Apply property type filter if selected
      if (propertyType !== 'all') {
        query = query.eq('property_type', propertyType);
      }
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching properties:', error);
        setLoading(false);
        return;
      }
      
      // Group data by city
      const cityData = {};
      
      data.forEach(property => {
        if (!property.city) return;
        
        if (!cityData[property.city]) {
          cityData[property.city] = {
            totalProperties: 0,
            totalUnits: 0
          };
        }
        
        cityData[property.city].totalProperties++;
        cityData[property.city].totalUnits += property.quantity || 0;
      });
      
      // Format for chart
      const chartData = Object.keys(cityData)
        .map(city => ({
          city,
          propertyCount: cityData[city].totalProperties,
          unitCount: cityData[city].totalUnits
        }))
        .sort((a, b) => b.unitCount - a.unitCount) // Sort by unit count descending
        .slice(0, 10); // Top 10 cities
      
      setData(chartData);
      setLoading(false);
    }
    
    fetchData();
  }, [propertyType]);
  
  // Get unique property types for filter
  const getPropertyTypes = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('properties')
      .select('property_type')
      .not('property_type', 'is', null);
    
    if (error || !data) return [];
    
    return [...new Set(data.map(item => item.property_type))];
  };
  
  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold">Property Distribution by City</h2>
        
        <div className="flex items-center mt-2 md:mt-0">
          <MdFilterList className="mr-2" />
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="border rounded-md px-3 py-1 bg-white"
          >
            <option value="all">All Property Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <p>Loading property data...</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="city" />
              <YAxis label={{ value: 'Total Units', angle: -90, position: 'insideLeft' }} />
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
              <Bar 
                dataKey="unitCount" 
                name="Total Units" 
                fill="#3B82F6"
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-500 mt-2">
            Showing top 10 cities by number of units
          </p>
        </div>
      )}
    </div>
  );
}