import L from "leaflet";

/**
 * Creates custom L.divIcon colored circle markers for incidents.
 * Severities: CRITICAL (red), HIGH (orange), MEDIUM (amber), LOW (green).
 * Resolved incidents are visually faded.
 */
export function createIncidentIcon(
  severity: string,
  isResolved: boolean = false,
  label: string = "!"
): L.DivIcon {
  const normSev = (severity || "LOW").toUpperCase();

  let bgColor = "#16a34a"; // green
  if (normSev === "CRITICAL") bgColor = "#dc2626";
  else if (normSev === "HIGH") bgColor = "#ea580c";
  else if (normSev === "MEDIUM") bgColor = "#d97706";

  const opacity = isResolved ? 0.45 : 1;
  const pulseClass = !isResolved && normSev === "CRITICAL" ? "animate-pulse" : "";

  const html = `
    <div style="
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: ${bgColor};
      opacity: ${opacity};
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      font-size: 11px;
      font-family: sans-serif;
      transform: translate(-13px, -13px);
    " class="${pulseClass}">
      ${label}
    </div>
  `;

  return L.divIcon({
    className: "custom-incident-pin",
    html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
}

/**
 * Creates custom L.divIcon colored circle markers for response teams.
 * Status: AVAILABLE (blue), BUSY (grey).
 * Category Initial: FIRE (F), MEDICAL (M), RESCUE (R), POLICE (P), DISASTER (D).
 */
export function createTeamIcon(
  category: string,
  status: string = "AVAILABLE"
): L.DivIcon {
  const isAvailable = (status || "").toUpperCase() === "AVAILABLE";
  const bgColor = isAvailable ? "#2563eb" : "#64748b"; // blue vs grey

  const normCat = (category || "OTHER").toUpperCase();
  let letter = "T";
  if (normCat === "FIRE") letter = "F";
  else if (normCat === "MEDICAL") letter = "M";
  else if (normCat === "RESCUE") letter = "R";
  else if (normCat === "POLICE") letter = "P";
  else if (normCat === "DISASTER") letter = "D";

  const html = `
    <div style="
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: ${bgColor};
      border: 2px solid #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 900;
      font-size: 12px;
      font-family: monospace;
      transform: translate(-14px, -14px);
    ">
      ${letter}
    </div>
  `;

  return L.divIcon({
    className: "custom-team-pin",
    html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

