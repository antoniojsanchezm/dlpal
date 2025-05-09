import { FormControlLabel, Switch } from "@mui/material";
import IconAndText from "./IconAndText";

function Toggler({ checked, changeHook, disabled, icon, label }) {
  return (
    <FormControlLabel control={(
      <Switch checked={checked} onChange={(e) => changeHook(e.target.checked)} disabled={disabled} />
    )} label={<IconAndText icon={icon} text={label} />} />
  );
}

export default Toggler;