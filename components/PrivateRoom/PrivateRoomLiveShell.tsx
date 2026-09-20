import PrivateRoomLuxuryNav from "./PrivateRoomLuxuryNav";
import PrivateRoomAccount from "./PrivateRoomAccount";
import PrivateRoomLiveLobby from "./PrivateRoomLiveLobby";
import PrivateRoomMyCamDock from "./PrivateRoomMyCamDock";
import PrivateRoomWelcomeTour from "./PrivateRoomWelcomeTour";
import "./PrivateRoomLuxury.css";
import "./PrivateRoomLatestUpdate.css";
import "./PrivateRoomLayoutGuard.css";

export default function PrivateRoomLiveShell() {
  return (
    <>
      <PrivateRoomLuxuryNav />
      <PrivateRoomAccount />
      <PrivateRoomLiveLobby />
      <PrivateRoomMyCamDock />
      <PrivateRoomWelcomeTour />
    </>
  );
}
