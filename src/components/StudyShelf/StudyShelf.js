import React, { useState, useEffect } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Drawer, Button, Group, Menu } from "@mantine/core";
import { useAuth0 } from "@auth0/auth0-react";
import makeAuthenticatedRequest from "../Authentication/Api";
import { useMantineReactTable, MantineReactTable } from 'mantine-react-table';
import { useColumns } from './columns';
import { IconUserCircle, IconSend } from '@tabler/icons-react';

function StudyShelf({ connectionType, onStudyClick }) {
  const [opened, { open, close }] = useDisclosure(false);
  const [studiesData, setStudiesData] = useState([]);
  const { user } = useAuth0();
  const columns = useColumns();

  useEffect(() => {
    console.log("Final data being rendered:", studiesData);
  }, [studiesData]);


  useEffect(() => {

    const refreshCards = async () => {
      try {
        const username = user?.nickname;
        let schema = connectionType === "bike" ? "lts" : "sidewalk";
        const response = await makeAuthenticatedRequest(
          `${process.env.REACT_APP_API_URL}/get_user_studies?username=${username}&schema=${schema}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        const data = await response.json();

        if (data.studies && Array.isArray(data.studies) && data.studies.length > 0) {
          const processedData = data.studies.map(study => ({
            ...study,
            bikeCrashesMessage: study.bike_ped_crashes.find(crash => typeof crash === 'string' && crash.includes('414'))
              ? 'Segment too long for crash API'
              : `${study.bike_ped_crashes[0]?.['Total Bike Crashes'] ?? 0} `,
            pedCrashesMessage: study.bike_ped_crashes.find(crash => typeof crash === 'string' && crash.includes('414'))
              ? 'Segment too long for crash API'
              : `${study.bike_ped_crashes[0]?.['Total Pedestrian Crashes'] ?? 0} `,
          }));
          setStudiesData(processedData);
        } else {
          console.error("No studies data found or invalid data structure.");
          setStudiesData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setStudiesData([]);
      }
    };



    refreshCards();
  }, [user, connectionType, opened]);

  const table = useMantineReactTable({
    columns,
    data: studiesData,
    enableRowActions: true,
    renderRowActionMenuItems: () => (
      <>
        <Menu.Item icon={<IconUserCircle />}>View Profile</Menu.Item>
        <Menu.Item icon={<IconSend />}>Send Email</Menu.Item>
      </>
    ),
  });

  return (
    <>
      <Drawer
        opened={opened}
        onClose={close}
        transitionProps={{ transition: "slide-up" }}
        position="bottom"
        overlayOpacity={0}
        overlayColor="transparent"
        withOverlay={false}
      >
        <MantineReactTable table={table} />
      </Drawer>
      <Group position="center">
        <Button onClick={open}>My Studies</Button>
      </Group>
    </>
  );
}

export default StudyShelf;
