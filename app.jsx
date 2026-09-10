import { useEffect, useState } from "react";
import VaultHome from "./components/VaultHome/VaultHome";
import PrivateRoom from "./components/PrivateRoom/PrivateRoom";

function getRoute() {
  return typeof window !== "undefined" ? window.location.hash || "#/" : "#/";
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", handleRouteChange);
    return () => window.removeEventListener("hashchange", handleRouteChange);
  }, []);

  if (route === "#/private-room") {
    return <PrivateRoom />;
  }

  return <VaultHome />;
}
