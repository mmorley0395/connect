import React, { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import mapboxgl from "mapbox-gl";
import { Text, Stack, Box, Table, Space } from "@mantine/core";
import bbox from "@turf/bbox";
import makeAuthenticatedRequest from "../Authentication/Api";
import Logo from "../Logo/Logo";
import Draft from "../Logo/Draft";
import Legend from "../Legends/Legend";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

const SharedStudy = ({
  username: propUsername,
  schema: propSchema,
  studyId,
}) => {
  const { user } = useAuth0();
  const [study, setStudy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [mapStyleLoaded, setMapStyleLoaded] = useState(false);
  const sourceId = "user_geoms";
  const layerId = "user_geoms";
  let schema = "none";

  if (propSchema == "lts") {
    schema = "bike";
  } else {
    schema = "sw";
  }

  const fetchStudy = async () => {
    try {
      const authUsername = user?.nickname || propUsername;
      let resolvedSchema = propSchema;
      const response = await makeAuthenticatedRequest(
        `${process.env.REACT_APP_API_URL}/get_user_studies?username=${authUsername}&schema=${resolvedSchema}&study_name=${studyId}`,
      );
      if (!response.ok) throw new Error("Study not found");
      const data = await response.json();
      if (!data.studies[0].shared) throw new Error("Study not shared");
      setStudy(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGeoms = async () => {
    const authUsername = user?.nickname || propUsername;
    let resolvedSchema = propSchema;
    try {
      const response = await makeAuthenticatedRequest(
        `${process.env.REACT_APP_API_URL}/get_user_study_geoms?username=${authUsername}&study=${studyId}&schema=${resolvedSchema}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      setGeojsonData(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const addGeoJsonLayer = () => {
    if (!map.current || !geojsonData) return;
    if (map.current.getSource(sourceId)) {
      map.current.getSource(sourceId).setData(geojsonData);
    } else {
      map.current.addSource(sourceId, {
        type: "geojson",
        data: geojsonData,
      });
    }
    if (!map.current.getLayer(layerId)) {
      map.current.addLayer(
        {
          id: layerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": "teal",
            "fill-opacity": 0.5,
          },
        },
        propSchema === "lts" ? "lts" : "sw",
      );
    }

    const bounds = bbox(geojsonData);
    map.current.fitBounds(bounds, { padding: 100 });
  };

  useEffect(() => {
    if (mapStyleLoaded && geojsonData) {
      addGeoJsonLayer();
    }
  }, [mapStyleLoaded, geojsonData]);

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-75.16, 40.05],
        zoom: 8.5,
      });
      map.current.on("load", () => {
        map.current.addSource("lts_tile", {
          type: "vector",
          url: "https://www.tiles.dvrpc.org/data/lts_v2.json",
          minzoom: 8,
          promoteId: "id",
        });
        map.current.addSource("sw_tile", {
          type: "vector",
          url: "https://www.tiles.dvrpc.org/data/pedestrian-network.json",
          minzoom: 8,
        });
        if (propSchema === "lts") {
          map.current.addLayer(
            {
              id: "lts",
              type: "line",
              source: "lts_tile",
              "source-layer": "lts",
              paint: {
                "line-width": 1,
                "line-opacity": {
                  property: "lts",
                  stops: [
                    [1, 1],
                    [2, 1],
                    [3, 0.5],
                    [4, 0.5],
                  ],
                },
                "line-color": {
                  property: "lts",
                  stops: [
                    [1, "green"],
                    [2, "lightgreen"],
                    [3, "yellow"],
                    [4, "red"],
                  ],
                },
              },
            },
            "road-label-simple",
          );
        } else if (propSchema === "sidewalk") {
          map.current.addLayer(
            {
              id: "sw",
              type: "line",
              source: "sw_tile",
              "source-layer": "ped_lines",
              paint: {
                "line-width": 1,
                "line-opacity": 1,
                "line-color": [
                  "match",
                  ["get", "feat_type"],
                  "UNMARKED",
                  "#FF0000",
                  "#00A36C",
                ],
              },
            },
            "road-label-simple",
          );
        }
        setMapStyleLoaded(true);
      });
    }
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (studyId) {
      fetchStudy();
      fetchGeoms();
    }
  }, [studyId]);

  if (error) return <div>Error: {error}</div>;
  return (
    <Stack
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        background: "rgb(47, 79, 79)",
      }}
    >
      <Box
        sx={{ flex: 1, overflowY: "auto" }}
        style={{
          padding: "10px",
          background: "rgb(47, 79, 79)",
          color: "white",
          maxWidth: "40%",
        }}
      >
        {study && (
          <div>
            <Legend connectionType={schema} />
            <Draft logoWidth={"100px"} />
            <Space h="s" />
            <Logo logoWidth={"150px"} />
            <h3>Study Name: {study.studies[0].seg_name}</h3>
            <a
              href="https://dvrpc.github.io/link-docs/getting-started/Interpreting-the-results/"
              target="_blank"
              rel="noopener noreferrer"
            >
              How to interpret these results
            </a>
            <Table>
              <tbody>
                <tr>
                  <td>
                    <strong>Username:</strong>
                  </td>
                  <td>{study.studies[0].username}</td>
                  <td>
                    <strong>Has Isochrone:</strong>
                  </td>
                  <td>{study.studies[0].has_isochrone ? "Yes" : "No"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Miles:</strong>
                  </td>
                  <td>{study.studies[0].miles}</td>
                  <td>
                    <strong>Total Population:</strong>
                  </td>
                  <td>{study.studies[0].total_pop}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Disabled:</strong>
                  </td>
                  <td>{study.studies[0].disabled}</td>
                  <td>
                    <strong>Ethnic Minority:</strong>
                  </td>
                  <td>{study.studies[0].ethnic_minority}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Female:</strong>
                  </td>
                  <td>{study.studies[0].female}</td>
                  <td>
                    <strong>Foreign Born:</strong>
                  </td>
                  <td>{study.studies[0].foreign_born}</td>
                </tr>
                <tr>
                  <td>
                    <strong>LEP:</strong>
                  </td>
                  <td>{study.studies[0].lep}</td>
                  <td>
                    <strong>Low Income:</strong>
                  </td>
                  <td>{study.studies[0].low_income}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Older Adult:</strong>
                  </td>
                  <td>{study.studies[0].older_adult}</td>
                  <td>
                    <strong>Racial Minority:</strong>
                  </td>
                  <td>{study.studies[0].racial_minority}</td>
                </tr>
                <tr>
                  <td>
                    <strong>Youth:</strong>
                  </td>
                  <td>{study.studies[0].youth}</td>
                  <td>
                    <strong>Total Jobs:</strong>
                  </td>
                  <td>{study.studies[0].total_jobs}</td>
                </tr>

                {/* Crashes Information */}
                {study.studies[0].bike_ped_crashes.map((crash, index) => (
                  <tr key={`crash-${index}`}>
                    <td>
                      <strong>Bike/Pedestrian Crash {index + 1}:</strong>
                    </td>
                    <td colSpan={3}>
                      Bike: {crash["Total Bike Crashes"]}, Pedestrian:{" "}
                      {crash["Total Pedestrian Crashes"]}
                    </td>
                  </tr>
                ))}

                {/* Essential Services */}
                {study.studies[0].essential_services.map((service, index) => (
                  <tr key={`service-${index}`}>
                    <td>
                      <strong>Essential Service {index + 1}:</strong>
                    </td>
                    <td colSpan={3}>
                      {service.type}: {service.count}
                    </td>
                  </tr>
                ))}

                {/* Rail Stations */}
                {study.studies[0].rail_stations.map((station, index) => (
                  <tr key={`station-${index}`}>
                    <td>
                      <strong>Rail Station {index + 1}:</strong>
                    </td>
                    <td colSpan={3}>
                      {station.type}: {station.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <h4>
              This study was generated with{" "}
              <a
                href="https://cloud.dvrpc.org/webmaps/link/login"
                target="_blank"
                rel="noopener noreferrer"
              >
                DVRPC LINK
              </a>
            </h4>
            <Text>
              Data sources: US Census American Community Survey (ACS) 5-year
              estimates (2017-2021), American Census Bureau’s LODES 8 dataset
              (2020), NJDOT (2019-2023), PennDOT (2019-2023), NJTransit (2023),
              SEPTA (2023)
            </Text>
            <Text size="sm">
              This web page is a public resource of general information. The
              Delaware Valley Regional Planning Commission (DVRPC) makes no
              warranty, representation, or guarantee as to the content,
              sequence, accuracy, timeliness, or completeness of any of the
              spatial data or database information provided herein. DVRPC and
              partner state, local, and other agencies shall assume no liability
              for errors, omissions, or inaccuracies in the information provided
              regardless of how caused; or any decision made or action taken or
              not taken by any person relying on any information or data
              furnished within.
            </Text>
          </div>
        )}
      </Box>
      <Box
        ref={mapContainer}
        sx={{ flex: 1 }}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </Stack>
  );
};

export default SharedStudy;
