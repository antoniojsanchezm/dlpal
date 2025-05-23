import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import DLPalContextProvider from "./contexts/DLPalContext";

import "./assets/main.css";
import "@fontsource-variable/montserrat";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#020617",
      paper: "#020617"
    }
  },
  typography: {
    fontFamily: "Montserrat Variable"
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <DLPalContextProvider>
        <App />
      </DLPalContextProvider>
    </ThemeProvider>
  </React.StrictMode>
);
