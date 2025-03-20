// src/components/LeaseUpChart.js
'use client';
import { useState, useEffect } from 'react';
import { createclient } from '@/utils/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MdFilterList } from 'react-icons/md';

export default function LeaseUpChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    async function fetchData() {
      // Fetch and aggregate lease up data from Supabase
      const query = createclient()
        .from('lease_up_performance')
        .select(`
          lease_up_time,
          properties(city, property_type)
        `);
        
      if (filter !== 'all') {
        query.eq('properties.property_type', filter);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching data:', error);
        return;
      }
      
      // Process the data for the chart
      const cityData = data.reduce((acc, item) => {
        const city = item.properties.city;
        if (!acc[city]) {
          acc[city] = { count: 0, totalTime: 0 };
        }
        acc[city].count++;
        acc[city].totalTime += item.lease_up_time;
        return acc;
      }, {});
      
      const chartData = Object.keys(cityData).map(city => ({
        city,
        averageLeaseUpTime: cityData[city].totalTime / cityData[city].count
      }));
      
      setData(chartData);
      setLoading(false);
    }
    
    fetchData();
  }, [filter]);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Average Lease-Up Time by City</h2>
        <div className="flex items-center">
          <MdFilterList className="mr-2" />
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded p-1"
          >
            <option value="all">All Properties</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="h-80 flex items-center justify-center">Loading data...</div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <XAxis dataKey="city" />
            <YAxis label={{ value: 'Months', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => [`${value.toFixed(1)} months`, 'Avg Lease-Up Time']} />
            <Legend />
            <Bar dataKey="averageLeaseUpTime" fill="#3B82F6" name="Average Lease-Up Time (Months)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}