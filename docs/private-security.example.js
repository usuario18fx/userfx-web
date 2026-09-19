// Ejemplo Express / Next / similar
app.post("/api/private-security", async (req, res) => {
  const { event, code, deviceId, timestamp, userAgent, fileId } = req.body;

  await db.securityEvents.insert({
    event,
    accessCode: code,
    deviceId,
    fileId: fileId ?? null,
    userAgent,
    ip: req.ip,
    createdAt: new Date(timestamp),
  });

  // Opcional: si es reincidente, revocar la sesión
  const count = await db.securityEvents.countByDevice(deviceId, { since: "24h" });
  if (count >= 5) {
    await db.sessions.revoke(code);
  }

  res.status(204).end();
});