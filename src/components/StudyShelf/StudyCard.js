import React, { useState } from "react";
import { Card, Image, Text, Button, Group, TextInput } from "@mantine/core";

function StudyCard({ data, username, connection, onRenameSuccess }) {
  console.log(data.has_isochrone);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(data.seg_name);

  const handleRename = async () => {
    setIsEditing(false);
    try {
      if (connection === "bike") {
        var schema = "lts";
      } else if (connection === "pedestrian") {
        var schema = "sidewalk";
      }

      const response = await fetch(
        `http://localhost:8000/rename?username=${username}&schema=${schema}`,

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldName: data.seg_name,
            newName: name,
          }),
        },
      );

      if (response.status === 200) {
        const data = await response.json();
        console.log("Server response:", data);
        if (typeof onRenameSuccess === "function") {
          onRenameSuccess();
        }
      } else {
        console.log("Error:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Network error:", error);
    }
  };
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Image
          src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.ytimg.com%2Fvi%2FKvA02evfKvA%2Fmaxresdefault.jpg&f=1&nofb=1"
          height={160}
          alt="NERV"
        />
      </Card.Section>

      <Group justify="space-between" mb="md" style={{ alignItems: "flex-end" }}>
        <Button
          variant="light"
          size="xs"
          color="blue"
          justify="right"
          mt="md"
          radius="md"
          onClick={isEditing ? handleRename : () => setIsEditing(true)}
        >
          {isEditing ? "Save" : "Rename"}
        </Button>
        {isEditing ? (
          <TextInput
            placeholder="New name"
            value={name}
            size="xs"
            onChange={(event) => setName(event.currentTarget.value)}
          />
        ) : (
          <Text fw={500}>{data.seg_name}</Text>
        )}
      </Group>

      <Text size="sm" c="dimmed">
        Philadelphia island?{" "}
        <Text span c="teal">
          {data.has_isochrone.toString()}{" "}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Miles of low-stress islands:
        <Text span c="teal">
          {data.miles}{" "}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Total population:
        <Text span c="teal">
          {data.total_pop}{" "}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Hispanic/Latino population:
        <Text span c="teal">
          {data.hisp_lat}{" "}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Nearby circuit trails:
        <Text span c="teal">
          {JSON.stringify(data.circuit_trails)}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Jobs:
        <Text span c="teal">
          {JSON.stringify(data.jobs)}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Bike crashes on segment:
        <Text span c="teal">
          {JSON.stringify(data.bike_crashes)}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Ped crashes on segment:
        <Text span c="teal">
          {JSON.stringify(data.ped_crashes)}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Essential services
        <Text span c="teal">
          {JSON.stringify(data.essential_services)}
        </Text>
      </Text>
      <Text size="sm" c="dimmed">
        Rail Stations
        <Text span c="teal">
          {JSON.stringify(data.rail_stations)}
        </Text>
      </Text>
    </Card>
  );
}

export default StudyCard;
