import React, { useEffect, useRef, useState } from "react";
import RegionalHeader from "./RegionalHeader"
import mapboxgl from "mapbox-gl";
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

const RegionalCx = ({ themeType, isLoading, setIsLoading }) => {
  const mapContainer = useRef(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const counties = ['DVRPC Region (All Counties)', 'Bucks', 'Burlington', 'Camden', 'Chester', 'Delaware', 'Gloucester', 'Mercer', 'Montgomery', 'Philadelphia'];
  const attributes = ['total_pop', 'disabled', 'ethnic_minority', 'female', 'foreign_born', 'lep', 'low_income', 'older_adult', 'racial_minority', 'youth', 'total_jobs'];
  const [currentCounty, setCurrentCounty] = useState('DVRPC Region (All Counties)');
  const [currentAttribute, setCurrentAttribute] = useState('total_pop');
  const [maxOfAttribute, setMaxOfAttribute] = useState(-Infinity);
  const colors = [
    '#0000ff', // Blue
    '#4b00ff',
    '#8000ff',
    '#aa00ff',
    '#d100ff',
    '#ff00ff', // Pink
    '#ff66ff',
    '#ff99ff',
    '#ffccff',
    '#ffffff'  // White
  ];
  useEffect(() => {
    const fetchGeoJSON = async () => {
      try {
        const response = await fetch('./for_mapbox.geojson');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        setGeojsonData(data);
        const max = data.features.reduce((max, feature) => {
          if (!currentCounty || currentCounty === 'DVRPC Region (All Counties)' || feature.properties.co_name === currentCounty) {
            return Math.max(max, feature.properties[currentAttribute]);
          }
          return max;
        }, -Infinity);
        setMaxOfAttribute(max);
        console.log('Max attribute value:', max);
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    fetchGeoJSON();
  }, []);


  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainer.current,
      style: themeType === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [-75.16, 40.05],
      zoom: 8.5,
    });

    mapInstance.on("load", () => {
      if (geojsonData) {
        mapInstance.addSource("regional", {
          type: "geojson",
          data: geojsonData
        });

        const values = geojsonData.features
          .filter(feature => !currentCounty || currentCounty === 'DVRPC Region (All Counties)' || feature.properties.co_name === currentCounty)
          .map(feature => feature.properties[currentAttribute])
          .filter(value => value !== null && value !== undefined)
          .sort((a, b) => a - b);

        const quantiles = Array.from({ length: 10 }, (_, i) => {
          const index = Math.floor((i + 1) * values.length / 10) - 1;
          return values[index];
        });
        console.log('Quantiles:', quantiles);
        const colorStops = quantiles.map((quantile, index) => [quantile, colors[index]]);
        console.log('Color Stops:', colorStops);

        mapInstance.addLayer(
          {
            id: "region",
            type: "line",
            source: "regional",
            paint: {
              "line-width": 2,
              "line-color": {
                property: currentAttribute,
                stops: colorStops,
              },
            },
          },
          "road-label-simple",
        );

        if (mapInstance.getLayer('region')) {
          if (currentCounty !== 'DVRPC Region (All Counties)') {
            mapInstance.setFilter('region', ['==', ['get', 'co_name'], currentCounty]);
          } else {
            mapInstance.setFilter('region', null);
          }
        }

        mapInstance.on('click', 'region', (e) => {
          const coordinates = e.lngLat;
          const properties = e.features[0].properties;
          const popupContent = Object.keys(properties)
            .map(key => `<strong>${key}:</strong> ${properties[key]}`)
            .join('<br>');

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`<div style="color: black;">${popupContent}</div>`)
            .addTo(mapInstance);
        });

        mapInstance.on('mouseenter', 'region', () => {
          mapInstance.getCanvas().style.cursor = 'pointer';
        });

        mapInstance.on('mouseleave', 'region', () => {
          mapInstance.getCanvas().style.cursor = '';
        });
      }
    });

    return () => mapInstance.remove();
  }, [themeType, geojsonData, currentCounty, currentAttribute, maxOfAttribute]);
  return (
    <>
      <div className="parent">
        <RegionalHeader counties={counties} attributes={attributes} setCurrentCounty={setCurrentCounty} setCurrentAttribute={setCurrentAttribute} />
        <div
          ref={mapContainer}
          className="regional-map-container"
          style={{ width: "100%", height: "100%", position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              backgroundColor: "rgb(47, 79, 79)",
              padding: "10px",
              borderRadius: "5px",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
              zIndex: 1
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex" }}>
                {colors.map(color => (
                  <div key={color} style={{ width: "20px", height: "20px", backgroundColor: color }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "5px" }}>
                <span style={{ color: "white" }}>Low</span>
                <span style={{ color: "white" }}>High</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default RegionalCx;
