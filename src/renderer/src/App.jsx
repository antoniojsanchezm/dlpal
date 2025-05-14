import { ToastContainer, toast } from "react-toastify";
import SuccessToast from "./components/SuccessToast";
import DisclaimerDialog from "./components/dialogs/DisclaimerDialog";
import Credits from "./components/Credits";
import QueueDialog from "./components/dialogs/QueueDialog";
import URLSection from "./components/sections/URLSection";
import PanelSection from "./components/sections/PanelSection";
import { useContext } from "react";
import { DLPalContext } from "./contexts/DLPalContext";

function App() {
  const { show_toast, queue_open } = useContext(DLPalContext);

  if (show_toast && !queue_open) toast(SuccessToast, {
    position: "bottom-right",
    autoClose: 5000,
    hideProgressBar: true,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "dark"
  });

  return (
    <div>
      <div className="p-8">
        <div className="flex flex-col gap-5">
          <div className="uncopyable">
            <span className="text-3xl">dlpal</span>
          </div>
          <URLSection />
          <PanelSection />
        </div>
      </div>
      <Credits />
      <DisclaimerDialog />
      <QueueDialog />
      <ToastContainer />
    </div>
  )
}

export default App;