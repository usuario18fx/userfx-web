/* ═══════════ USER FX · LOCAL PRIVATE ROOM SESSION ═══════════ */

const DEV_ACCESS_PATH = "/api/access-session";

const DEV_SESSION = Object.freeze({
  ok:true,
  authenticated:true,
  accountId:"usr_DEV_USER18FX",
  telegramUsername:"@User18Fx",
  planId:"vip",
  accessMode:"telegram_identity",
  accessLabel:"SPCL",
  memberAccess:true,
  maxAccesses:null,
  usedAccesses:0,
  remainingAccesses:null,
  unlimitedAccess:true,
  expiresAt:null,
});

if (import.meta.env.DEV && typeof window !== "undefined") {
  const devWindow = window as typeof window & {
    __userfxPrivateRoomDevFetch?:boolean;
  };

  if (!devWindow.__userfxPrivateRoomDevFetch) {
    const nativeFetch = window.fetch.bind(window);

    const devFetch:typeof window.fetch = async (input,init) => {
      const requestUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      const requestMethod = String(
        init?.method || (input instanceof Request ? input.method : "GET"),
      ).toUpperCase();

      try {
        const url = new URL(requestUrl,window.location.origin);

        if (url.pathname === DEV_ACCESS_PATH && requestMethod === "GET") {
          return new Response(JSON.stringify(DEV_SESSION),{
            status:200,
            headers:{
              "Content-Type":"application/json",
              "Cache-Control":"no-store",
            },
          });
        }
      } catch {
        // Fall through to the real request.
      }

      return nativeFetch(input,init);
    };

    window.fetch = devFetch;
    devWindow.__userfxPrivateRoomDevFetch = true;
  }
}

export {};
