import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// You'll need to install mapbox-gl: npm install mapbox-gl

const PropertyMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(new mapboxgl.Popup({ closeButton: false }));
  const [state, setState] = useState('Texas'); // Default state
  
  // Define state-specific map configurations
  const stateConfigs = {
    Texas: {
      center: [-97.7431, 30.2672],
      zoom: 8,
      tilesetId: process.env.NEXT_PUBLIC_TX_MAPBOX,
      sourceLayer: 'Texas_mapbox-a84j0i',
    },
    Ohio: {
      center: [-81.5188, 41.0812],
      zoom: 8,
      tilesetId: process.env.NEXT_PUBLIC_OH_MAPBOX, // Fallback to TX if OH not available
      sourceLayer: 'Ohio_mapbox-5pn39x', // Replace with actual Ohio source layer
    }
  };
    // Function to handle AI interaction
    const askAIAboutProperty = (question, propertyData, chatElement) => {
      // Show loading indicator
      chatElement.innerHTML += `<div class="ai-message-loading">AI is thinking...</div>`;
      
      // Mock AI response for demo purposes
      // Replace this with your actual AI service implementation
      setTimeout(() => {
        // Remove loading indicator
        chatElement.removeChild(chatElement.lastChild);
        
        // Generate a property-specific response
        let aiResponse = '';
        if (question.toLowerCase().includes('price')) {
          aiResponse = `This property is priced at $${propertyData.price || 'N/A'}, which is ${Math.random() > 0.5 ? 'above' : 'below'} the average for this area.`;
        } else if (question.toLowerCase().includes('location')) {
          aiResponse = `This property is located in a ${Math.random() > 0.5 ? 'high demand' : 'growing'} neighborhood with good access to amenities.`;
        } else if (question.toLowerCase().includes('invest')) {
          aiResponse = `Based on recent trends, this area has shown ${Math.random() > 0.5 ? 'strong' : 'moderate'} appreciation in property values.`;
        } else {
          aiResponse = `This property has interesting features. I recommend visiting for a full assessment.`;
        }
        
        // Display AI response
        chatElement.innerHTML += `<div class="ai-message">AI: ${aiResponse}</div>`;
        
        // Scroll to bottom of chat
        chatElement.scrollTop = chatElement.scrollHeight;
      }, 1000);};

  // Function to update map based on selected state
  const updateMap = () => {
    if (!mapRef.current) return;
    
    const config = stateConfigs[state];
    
    // Update map center and zoom
    mapRef.current.flyTo({
      center: config.center,
      zoom: config.zoom,
      essential: true // This animation is considered essential for the map's purpose
    });
    
    // Check if the source already exists
    if (mapRef.current.getSource('properties')) {
      // Update the existing source
      mapRef.current.removeLayer('property-points');
      mapRef.current.removeSource('properties');
    }
    
    // Add the new source and layer
    mapRef.current.addSource('properties', {
      type: 'vector',
      url: `mapbox://${config.tilesetId}`
    });

    mapRef.current.addLayer({
      'id': 'property-points',
      'type': 'circle',
      'source': 'properties',
      'source-layer': config.sourceLayer,
      'paint': {
        'circle-radius': 6,
        'circle-color': '#FF0000' ,// defa,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#fff'
      }
    });
    
    // Re-add event listeners
    addEventListeners();
  };
  
  // Function to add event listeners to the map layer
  const addEventListeners = () => {
    // Add popup on hover
    mapRef.current.on('mouseenter', 'property-points', (e) => {
      // Change cursor style
      mapRef.current.getCanvas().style.cursor = 'pointer';
      
      // Get coordinates and properties
      const coordinates = e.features[0].geometry.coordinates.slice();
      const properties = e.features[0].properties;
      
      // Create popup content using your CSV properties
      const popupContent = `
        <h3>${properties.title || properties.Name || 'Property Details'}</h3>
        <p>Address: ${properties.Address || 'N/A'}</p>
        <p>Levels: ${properties.Level || 'N/A'}</p>
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

   // Add click interaction with AI-powered popup
   mapRef.current.on('click', 'property-points', (e) => {
    // Get coordinates and properties
    const coordinates = e.features[0].geometry.coordinates.slice();
    const properties = e.features[0].properties;

    console.log(properties);
    
    // Ensure that if the map is zoomed out such that multiple
    // copies of the feature are visible, the popup appears
    // over the copy being pointed to.
    if (['mercator', 'equirectangular'].includes(mapRef.current.getProjection().name)) {
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }
    }
    
    // Create popup content with property info and AI chat interface
    const popupContent = document.createElement('div');
    
    // Add property details section
    const propertyDetails = document.createElement('div');
    propertyDetails.innerHTML = `
      <h3>${properties.title || properties.Name || 'Property Details'}</h3>
      <p>Address: ${properties.Address || 'N/A'}</p>
      <p>Levels: ${properties.Level || 'N/A'}</p>
      <p>Year Built: ${properties.YearBuilt || 'N/A'}</p>
    `;
    
    // Generate a unique ID for this property
    const propertyId = properties.id || Math.random().toString(36).substring(2, 9);
    
    // Add AI chat interface
    const aiChat = document.createElement('div');
    aiChat.className = 'ai-chat-container';
    aiChat.innerHTML = `
      <div class="chat-messages" id="chat-messages-${propertyId}"></div>
      <div class="chat-input">
        <input type="text" id="ai-question-${propertyId}" 
          placeholder="Ask AI about this property...">
        <button id="ai-submit-${propertyId}">Ask</button>
      </div>
    `;
    
    // Append both sections to popup content
    popupContent.appendChild(propertyDetails);
    popupContent.appendChild(aiChat);
    
    // Create and display the popup
    const popup = new mapboxgl.Popup({ maxWidth: '400px' })
      .setLngLat(coordinates)
      .setDOMContent(popupContent)
      .addTo(mapRef.current);
    
    // Add event listener for the AI question submission
    setTimeout(() => {
      const submitButton = document.getElementById(`ai-submit-${propertyId}`);
      const questionInput = document.getElementById(`ai-question-${propertyId}`);
      const chatMessages = document.getElementById(`chat-messages-${propertyId}`);
      
      if (submitButton && questionInput && chatMessages) {
        submitButton.addEventListener('click', () => {
          const question = questionInput.value.trim();
          if (question) {
            // Display user question
            chatMessages.innerHTML += `<div class="user-message">You: ${question}</div>`;
            questionInput.value = '';
            
            // Call your AI service with the question and property data
            askAIAboutProperty(question, properties, chatMessages);
          }
        });
        
        // Allow pressing Enter to submit
        questionInput.addEventListener('keypress', (event) => {
          if (event.key === 'Enter') {
            submitButton.click();
          }
        });
      }
    }, 100);
  });
  };

  useEffect(() => {
    // Initialize the map
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOXGLACCESS_TOKEN;
    
    const config = stateConfigs[state];
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: config.center,
      zoom: config.zoom
    });

    // Add navigation controls
    mapRef.current.addControl(new mapboxgl.NavigationControl());

    // When the map has loaded
    mapRef.current.on('load', () => {
      // Add your tileset as a source
      mapRef.current.addSource('properties', {
        type: 'vector',
        url: `mapbox://${config.tilesetId}`
      });

      // Add a layer to display the properties
      mapRef.current.addLayer({
        'id': 'property-points',
        'type': 'circle',
        'source': 'properties',
        'source-layer': config.sourceLayer,
        'paint': {
          'circle-radius': 6,
          'circle-color': 
            '#FF0000' // default color
          ,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff'
        }
      });

      // Add event listeners
      addEventListeners();
    });

    // Clean up on unmount
    return () => {
      mapRef.current.remove();
    };
  }, []); // Initialize map once

  // Update map when state changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.loaded()) {
      updateMap();
    }
  }, [state]);

  return (
    <div className="rounded-lg shadow-xl overflow-hidden bg-white">
      <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold">Property Map</h2>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${state === 'Texas' ? 'text-blue-400' : 'text-white/70'}`}>
            Texas
          </span>
          <label className="relative inline-block w-14 h-8 align-middle cursor-pointer">
            <input
              type="checkbox"
              name="toggle"
              id="toggle"
              className="sr-only peer"
              checked={state === "Ohio"}
              onChange={() => setState(state === "Texas" ? "Ohio" : "Texas")}
            />
            <div className={`block w-14 h-8 rounded-full ${state === 'Texas' ? 'bg-blue-600' : 'bg-purple-600'} peer-checked:bg-purple-600 transition-colors`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform peer-checked:translate-x-6`}></div>
          </label>
          <span className={`text-sm font-medium ${state === 'Ohio' ? 'text-purple-400' : 'text-white/70'}`}>
            Ohio
          </span>
        </div>
      </div>
      <div className="p-2 bg-slate-100">
        <div 
          ref={mapContainerRef} 
          className="w-full h-[60vh] md:h-[70vh] lg:h-[80vh] rounded-lg"

        />
      </div>
    </div>
  );
};

export default PropertyMap;