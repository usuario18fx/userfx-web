import PrivateRoomLuxuryNav from "./PrivateRoomLuxuryNav";
import PrivateRoomAccount from "./PrivateRoomAccount";
import PrivateRoomLiveLobby from "./PrivateRoomLiveLobby";
import "./PrivateRoomLuxury.css";

export default function PrivateRoomLiveShell() {
  return (
    <>
      <PrivateRoomLuxuryNav />
      <PrivateRoomAccount />
      <PrivateRoomLiveLobby />
    </>
  );
}
