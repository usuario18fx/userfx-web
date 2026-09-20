import "./PrivateRoomDevSession";
import PrivateRoomDirectGate from "./PrivateRoomDirectGate";
import PrivateRoomLuxuryNav from "./PrivateRoomLuxuryNav";
import PrivateRoomAccount from "./PrivateRoomAccount";
import PrivateRoomLiveLobby from "./PrivateRoomLiveLobby";
import PrivateRoomMyCamDock from "./PrivateRoomMyCamDock";
import PrivateRoomWelcomeTour from "./PrivateRoomWelcomeTour";
import "./PrivateRoomLuxury.css";
import "./PrivateRoomUnified.css";

export default function PrivateRoomLiveShell() {
  return (
    <PrivateRoomDirectGate>
      <PrivateRoomLuxuryNav />
      <PrivateRoomAccount />
      <PrivateRoomLiveLobby />
      <PrivateRoomMyCamDock />
      <PrivateRoomWelcomeTour />
    </PrivateRoomDirectGate>
  );
}
