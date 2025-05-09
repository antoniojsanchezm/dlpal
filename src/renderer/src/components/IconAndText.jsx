import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function IconAndText({ icon, text }) {
  return (
    <>
      <FontAwesomeIcon icon={icon} />&nbsp;{text}
    </>
  );
}

export default IconAndText;