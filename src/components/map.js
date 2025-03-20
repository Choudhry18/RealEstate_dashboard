'use client'
import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

import 'mapbox-gl/dist/mapbox-gl.css';

const MapboxExample = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // State
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [hoveredPlace, setHoveredPlace] = useState(null);

  // Refs to track the latest state values
  const selectedPlaceRef = useRef(null);
  const hoveredPlaceRef = useRef(null);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiY2hvdWRocnkxOCIsImEiOiJjbThnbTZtYmYwb2ZvMmtvdmZ5MG1paGF3In0.O9Bmfw2_wQos-OSBr6uBWw';

    const map = (mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      center: [-74, 40.72],
      zoom: 12,
      bearing: 30,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: {
          colorPlaceLabelHighlight: 'red',
          colorPlaceLabelSelect: 'blue'
        }
      }
    }));

    map.addInteraction('place-click', {
      type: 'click',
      target: { featuresetId: 'place-labels', importId: 'basemap' },
      handler: ({ feature }) => {
        if (selectedPlaceRef.current) {
          map.setFeatureState(selectedPlaceRef.current, { select: false });
        }
        map.setFeatureState(feature, { select: true });
        setSelectedPlace(feature);
      }
    });

    map.addInteraction('place-mouseenter', {
      type: 'mouseenter',
      target: { featuresetId: 'place-labels', importId: 'basemap' },
      handler: ({ feature }) => {
        if (
          hoveredPlaceRef.current &&
          hoveredPlaceRef.current.id === feature.id
        )
          return;
        if (hoveredPlaceRef.current) {
          map.setFeatureState(hoveredPlaceRef.current, { highlight: false });
        }
        map.getCanvas().style.cursor = 'pointer';
        map.setFeatureState(feature, { highlight: true });
        setHoveredPlace(feature);
      }
    });

    map.addInteraction('place-mouseleave', {
      type: 'mouseleave',
      target: { featuresetId: 'place-labels', importId: 'basemap' },
      handler: () => {
        if (hoveredPlaceRef.current) {
          map.setFeatureState(hoveredPlaceRef.current, { highlight: false });
          setHoveredPlace(null);
        }
        map.getCanvas().style.cursor = '';
      }
    });

    map.addInteraction('map-click', {
      type: 'click',
      handler: () => {
        if (selectedPlaceRef.current) {
          map.setFeatureState(selectedPlaceRef.current, { select: false });
          setSelectedPlace(null);
        }
      }
    });

    return () => map.remove();
  }, []);

  // Sync Refs with State
  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  useEffect(() => {
    hoveredPlaceRef.current = hoveredPlace;
  }, [hoveredPlace]);

  const displayFeature = selectedPlace || hoveredPlace;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <div
        className="map-overlay"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: '230px',
          padding: '10px',
          color: '#1a2224',
          fontSize: '12px',
          lineHeight: '20px',
          fontFamily: 'sans-serif'
        }}
      >
        {displayFeature && (
          <div
            className="map-overlay-inner"
            style={{
              background: '#fff',
              padding: '10px',
              borderRadius: '3px'
            }}
          >
            <b>featureset</b>: <code>{displayFeature.target.featuresetId}</code>
            <br />
            <b>feature state</b>:{' '}
            <code>
              {Object.entries(
                mapRef.current.getFeatureState(displayFeature)
              ).map(([key, value]) => (
                <li>
                  <b>{key}</b>: {value.toString()}
                </li>
              ))}
            </code>
            <hr />
            <b>properties</b>
            {Object.entries(displayFeature.properties).map(([key, value]) => (
              <li>
                <b>{key}</b>: {value.toString()}
              </li>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapboxExample;