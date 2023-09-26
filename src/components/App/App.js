import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { themeConfig } from "./mantineTheme";
import MainComponent from "../MainComponent/MainComponent";
import LoginPage from "../Authentication/LoginPage";
import AuthenticatedLayout from "../Authentication/AuthenticatedLayout";

export default function App() {
  return (
    <MantineProvider theme={themeConfig} withGlobalStyles>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <AuthenticatedLayout>
                <MainComponent />
              </AuthenticatedLayout>
            }
          />
        </Routes>
      </Router>
    </MantineProvider>
  );
}
