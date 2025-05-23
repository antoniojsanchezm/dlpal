import { useContext } from "react";
import { DLPalContext } from "../contexts/DLPalContext";

export default function Credits() {
  const { setDisclaimerOpen } = useContext(DLPalContext);
  
  return (
    <div className="footer uncopyable pr-4 pb-4 flex flex-col gap-1 justify-end">
      <span className="text-xs text-blue-300 hover:font-bold hover:underline" onClick={async () => {
        await window.api.openLink("https://github.com/antoniojsanchezm/dlpal/releases");
      }}>dlpal v1.1.2</span>
      <span className="text-xs text-gray-500"><span className="text-red-500 hover:font-bold hover:underline" onClick={() => setDisclaimerOpen(true)}>Disclaimer</span> - <span className="hover:font-bold hover:underline" onClick={async () => {
        await window.api.openLink("https://github.com/antoniojsanchezm");
      }}>Developed by Antonio S.</span></span>
    </div>
  );
}