import { faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import IconAndText from "./IconAndText";

function SuccessToast({ }) {
  return (
    <div className="flex flex-col gap-1" style={{
      fontFamily: "Montserrat Variable"
    }}>
      <div className="flex items-center text-lime-400">
        <IconAndText icon={faCheckCircle} />
        <span className="text-md">Your downloads are ready!</span>
      </div>
    </div>
  );
}

export default SuccessToast;