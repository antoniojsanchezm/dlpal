import { useContext } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import DisclaimerAppName from "../DisclaimerAppName";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faTimes } from "@fortawesome/free-solid-svg-icons";
import IconAndText from "../IconAndText";
import { DLPalContext } from "../../contexts/DLPalContext";

export default function DisclaimerDialog() {
  const { disclaimer_open, setDisclaimerOpen } = useContext(DLPalContext);
  
  return (
    <Dialog open={disclaimer_open} onClose={() => setDisclaimerOpen(false)}>
      <DialogTitle><FontAwesomeIcon icon={faExclamationTriangle} />&nbsp;Disclaimer</DialogTitle>
      <DialogContent>
        <DialogContentText className="flex flex-col gap-4">
          <span><DisclaimerAppName /> will NOT be held responsible for what end users do with downloaded content.</span>
          <span><DisclaimerAppName /> does NOT own nor claim to own the rights to any of the content that end users can download.</span>
          <span><DisclaimerAppName /> is NOT associated in any way with YouTube or Google LLC.</span>
          <span>YouTube is a registered trademark of Google LLC.</span>
          <span><DisclaimerAppName /> is still a work in progress. Bugs are expected.</span>
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDisclaimerOpen(false)}><IconAndText icon={faTimes} text="Close" /></Button>
      </DialogActions>
    </Dialog>
  );
}