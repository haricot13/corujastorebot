async function runDiagnostic() {
  console.log("Polling state for 40 seconds...");
  for (let i = 1; i <= 8; i++) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusRes = await fetch('http://localhost:3000/api/status');
    const status = await statusRes.json();
    console.log(`[Interval ${i * 5}s] BotActive: ${status.botActive}, ConnectionStatus: ${status.connectionStatus}, QrType: ${status.qrType}, QRLength: ${status.qrCodeData?.length || 0}`);
  }

  const logsRes = await fetch('http://localhost:3000/api/logs');
  const logsData = await logsRes.json();
  const logs = logsData.logs || [];
  console.log("=== RECENT LOGS ===");
  logs.slice(-15).forEach(log => {
    console.log(`[${log.timestamp}] [${log.type.toUpperCase()}] ${log.text}`);
  });
}

runDiagnostic().catch(err => console.error("Diagnostic error:", err));
