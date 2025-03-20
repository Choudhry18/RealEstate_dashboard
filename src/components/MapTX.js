import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// You'll need to install mapbox-gl: npm install mapbox-gl

const PropertyMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(new mapboxgl.Popup({ closeButton: false }));

  useEffect(() => {
    // TO MAKE THE MAP APPEAR YOU MUST
    // ADD YOUR ACCESS TOKEN FROM
    // https://account.mapbox.com
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hvdWRocnkxOCIsImEiOiJjbThnbTZtYmYwb2ZvMmtvdmZ5MG1paGF3In0.O9Bmfw2_wQos-OSBr6uBWw';

    // Initialize the map
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11', // You can change the style
      center: [-99.9018, 31.9686], // Center of Texas
      zoom: 5
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl());

    // When the map has loaded
    mapRef.current.on('load', () => {
      // Add your tileset as a source
      mapRef.current.addSource('properties', {
        type: 'vector',
        url: 'mapbox://choudhry18.dxbp404b' // Replace with your actual tileset ID
      });

      // Add a layer to display the properties
      mapRef.current.addLayer({
        'id': 'property-points',
        'type': 'circle',
        'source': 'properties',
        'source-layer': 'property_data_for_mapbox_lowe-0hyh09', // This is often the filename of your original CSV without extension
        'paint': {
          'circle-radius': 6,
          'circle-color': [
            'match',
            ['get', 'property_type'], // Replace with a property from your CSV
            'residential', '#008000',
            'commercial', '#3bb2d0',
            'land', '#9ACD32',
            '#FF0000' // default color
          ],
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      });

      // Add popup on hover
      mapRef.current.on('mouseenter', 'property-points', (e) => {
        // Change cursor style
        mapRef.current.getCanvas().style.cursor = 'pointer';
        
        // Get coordinates and properties
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;
        
        // Create popup content using your CSV properties
        // Adjust these property names to match your actual data
        const popupContent = `
          <h3>${properties.name || 'Property'}</h3>
          <p>Price: $${properties.price || 'N/A'}</p>
          <p>Bedrooms: ${properties.bedrooms || 'N/A'}</p>
        `;
        
        // Display the popup
        popupRef.current
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(mapRef.current);
      });

      // Remove popup on mouseleave
      mapRef.current.on('mouseleave', 'property-points', () => {
        mapRef.current.getCanvas().style.cursor = '';
        popupRef.current.remove();
      });

      // Add click interaction
      mapRef.current.on('click', 'property-points', (e) => {
        // You can add custom click behavior here
        const properties = e.features[0].properties;
        console.log('Property clicked:', properties);
        
        // Example: You could open a modal with property details
        // openPropertyModal(properties);
      });
    });

    // Clean up on unmount
    return () => {
      mapRef.current.remove();
    };
  }, []); // Empty dependency array means this effect runs once on mount

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%', // Adjust height as needed
        borderRadius: '8px'
      }} 
    />
  );
};

export default PropertyMap;