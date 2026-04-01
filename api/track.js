export default async function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  console.log("TRACK VISIT IP:", ip);

  return res.status(200).json({
    ok: true,
  });
}
