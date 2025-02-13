import React, { useState, useContext } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Tooltip, Modal, Progress, Button, Text, Box } from "@mantine/core";
import { useAuth0 } from "@auth0/auth0-react";
import drawInstance from "../Map/MapboxDrawConfig";
import makeAuthenticatedRequest from "../Authentication/Api";

function AnalyzeButton({ connectionType, onAnalyze, disabled }) {
  const [project, setProject] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth0();
  const [opened, { open, close }] = useDisclosure(false);
  const [errorModalOpened, setErrorModalOpened] = useState(false);
  const [processingModalOpened, setProcessingModalOpened] = useState(false);



  const handleAnalyzeClick = () => {
    if (drawInstance) {
      const allFeatures = drawInstance.getAll();
      const automaticProjectName = checkAndSetProjectName(allFeatures.features);

      if (automaticProjectName) {
        setProject(automaticProjectName);
        sendDataToServer(allFeatures);
        setProcessingModalOpened(true);
      } else {
        open();
      }
    }
  };


  const checkAndSetProjectName = (features) => {
    for (const feature of features) {
      if (feature.properties && feature.properties.name) {
        return feature.properties.name;
      }
    }
    return null;
  };

  const handleChooseDifferentName = () => {
    setErrorModalOpened(false);
    setProcessingModalOpened(false);
    open();
  };

  const handleCancel = () => {
    setErrorModalOpened(false);
  }

  const handleOverwrite = async () => {
    setProcessingModalOpened(true);
    if (drawInstance) {
      const allFeatures = drawInstance.getAll();
      const featuresWithNames = allFeatures.features.map((feature, index) => {
        const properties = feature.properties || {};
        properties.name =
          properties.name || (index === 0 ? project : `${project}${index + 1}`);
        return { ...feature, properties };
      });
      setErrorModalOpened(false);

      try {
        await sendDataToServer(
          { ...allFeatures, features: featuresWithNames },
          true,
        );
        onAnalyze(project);
      } catch (error) {
        console.error("Failed to overwrite data:", error);
      }
    }
  };

  const handleResubmit = async () => {
    setProcessingModalOpened(true);
    if (drawInstance) {
      const allFeatures = drawInstance.getAll();
      const featuresWithNames = allFeatures.features.map((feature, index) => {
        const properties = feature.properties || {};
        properties.name =
          properties.name || (index === 0 ? project : `${project}${index + 1}`);
        return { ...feature, properties };
      });
      setErrorModalOpened(false);

      try {
        await sendDataToServer(
          { ...allFeatures, features: featuresWithNames },
          false,
          true
        );
        onAnalyze(project);
      } catch (error) {
        console.error("Failed to overwrite data:", error);
      }
    }
  };

  const sendDataToServer = async (geoJsonData, overwrite = false, resubmit = false) => {
    setIsLoading(true);
    const bodyData = {
      connection_type: connectionType,
      geo_json: geoJsonData,
      username: user.nickname,
    };

    const queryString = overwrite ? "?overwrite=true" : resubmit ? "?resubmit=true" : "";


    try {
      const response = await makeAuthenticatedRequest(
        `${process.env.REACT_APP_API_URL}/analyze${queryString}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        },
      );

      if (!response.ok) {
        setProcessingModalOpened(false);
        const errorData = await response.json();
        throw new Error(errorData.detail || "An error occurred");
      } else {
        setProcessingModalOpened(true)
      }

      const data = await response.json();
      console.log("Server response:", data);
      setProject("");
      close();
      setProcessingModalOpened(false);
    } catch (error) {
      setProcessingModalOpened(false);
      let errorMessage;
      if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = "Network error occured";
      }

      if (errorMessage.includes("Project name already used")) {
        setError("Project name already used.");
        setErrorModalOpened(true);
      } else if(errorMessage.includes("Mileage of connected islands exceeds 300")) {
        setError("")
        setErrorModalOpened(true)
      }
      else {
        setError(errorMessage);
        setErrorModalOpened(true);
        setProcessingModalOpened(false);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const applyProjectName = async () => {
    setProcessingModalOpened(false);
    if (drawInstance) {
      const allFeatures = drawInstance.getAll();
      console.log(allFeatures)

      let automaticProjectName = checkAndSetProjectName(allFeatures.features);
      if (automaticProjectName) {
        setProject(automaticProjectName);
        console.log("Project name in geojson:", automaticProjectName);
      } else {

        allFeatures.features.forEach((feature, index) => {
          feature.properties.name =
            index === 0 ? project : `${project}${index + 1}`;
        });
      }

      setIsLoading(true);
      setProcessingModalOpened(true);
      close();
      const bodyData = {
        connection_type: connectionType,
        geo_json: allFeatures,
        username: user.nickname,
      };

      try {
        const response = await makeAuthenticatedRequest(
          `${process.env.REACT_APP_API_URL}/analyze`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyData),
          },
        );

        const responseData = await response.json();

        if (!response.ok) {
          if (responseData.detail === "Project name already used.") {
            setError(responseData.detail);
            setErrorModalOpened(true);
          } else {
            throw new Error(
              responseData.detail ||
              "An error occurred while applying the project name.",
            );
          }
        } else {
          onAnalyze(project);
        }
      } catch (error) {
        let errorMessage = "Network error occurred";
        if (typeof error.message === "string") {
          try {
            const errorObj = JSON.parse(error.message);
            if (errorObj.detail) {
              errorMessage = errorObj.detail;
            }
          } catch (e) {
            errorMessage = error.message;
          }
        }
        setError(errorMessage);
        setErrorModalOpened(true);
      } finally {
        setIsLoading(false);
        setProcessingModalOpened(false);
      }

    }
  };

  return (
    <>
      {/* Error Modal */}
      <Modal opened={errorModalOpened} onClose={function() { setErrorModalOpened(false); }} title={error === "Mileage of connected islands exceeds 300" ? "Warning" : "Error"}>
        <Text>{error}</Text>
        {error === "Project name already used." && (
          <>
            <Button onClick={handleChooseDifferentName}>Choose Different Name</Button>
            <Button loading={isLoading} color="red" onClick={handleOverwrite}>Overwrite</Button>
          </>
        )}
        {error === "Mileage of connected islands exceeds 300" && (
          <>
            <br/>
            <Text>High mileage of connected islands currently causes excessively long processing times and failures. 
              Consider setting up a smaller study segment or a study less dense location. There is ongoing work to remedy this issue.</Text>
            <Box display='flex' gap='4px' marginTop='8px'>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button loading={isLoading} color="orange" onClick={handleResubmit}>Re-submit</Button>
            </Box>

          </>
        )}
      </Modal>


      {/* Study Name Modal */}
      <Modal opened={opened} onClose={close} title={isLoading ? "Processing..." : "Name your study"}>
        {!isLoading && (
          <>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="Enter study name"
            />
            <Button loading={isLoading} onClick={applyProjectName}>
              Submit
            </Button>
          </>
        )}
        {isLoading && <Text>Processing, please wait...</Text>}
      </Modal>

      {/* Processing modal */}
      <Modal opened={processingModalOpened} withCloseButton={false} title="Processing">
        <Text>Processing segments...</Text>
        <Progress value={100} striped animate />
      </Modal>


      {/* Analyze Button */}
      <Tooltip label="Run the analysis on your study. Your study should then populate on screen, and you can view the results with the 'My Studies' button.">
        <Button
          variant="filled"
          color="blue"
          style={{
            position: "absolute",
            top: "90px",
            left: "10px",
            zIndex: 10,
          }}
          onClick={handleAnalyzeClick}
          disabled={disabled}
        >
          Analyze
        </Button>
      </Tooltip >
    </>
  );
}

export default AnalyzeButton;
