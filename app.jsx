import VaultHome from "./components/VaultHome/VaultHome";
import PrivateRoom from "./components/PrivateRoom/PrivateRoom";

export default function App() {
  const route = typeof window !== "undefined" ? window.location.hash : "#/";

  if (route === "#/private-room") {
    return <PrivateRoom />;
  }

  return <VaultHome />;
}
