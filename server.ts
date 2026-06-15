import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import * as QRCodeNamespace from "qrcode";
const QRCode: any = (QRCodeNamespace as any).default || QRCodeNamespace;
import { connect } from "./takeshi-bot-main/src/connection.js";
import { load } from "./takeshi-bot-main/src/loader.js";
import { initDbSync } from "./takeshi-bot-main/src/utils/dbSync.js";
import {
  addAutoResponderItem,
  listAutoResponderItems,
  removeAutoResponderItemByKey,
  updateAutoResponderItemByKey,
  activateExitGroup,
  deactivateExitGroup,
  isActiveExitGroup,
  activateWelcomeGroup,
  deactivateWelcomeGroup,
  isActiveWelcomeGroup,
  activateGroup,
  deactivateGroup,
  isActiveGroup,
  activateAutoResponderGroup,
  deactivateAutoResponderGroup,
  isActiveAutoResponderGroup,
  activateAntiLinkGroup,
  deactivateAntiLinkGroup,
  isActiveAntiLinkGroup,
  activateAutoStickerGroup,
  deactivateAutoStickerGroup,
  isActiveAutoStickerGroup,
  activateOnlyAdmins,
  deactivateOnlyAdmins,
  isActiveOnlyAdmins,
  setPrefix,
  getPrefix,
  getSpiderApiToken,
  setSpiderApiToken
} from "./takeshi-bot-main/src/utils/database.js";

// Global storage with TS typings
declare global {
  var kazuyaSocket: any;
  var kazuyaConnectionStatus: "connected" | "connecting" | "disconnected";
  var kazuyaQrCodeData: string;
  var kazuyaQrType: "qr" | "pairing";
  var kazuyaManualStop: boolean;
}

globalThis.kazuyaConnectionStatus = globalThis.kazuyaConnectionStatus || "disconnected";
globalThis.kazuyaQrCodeData = globalThis.kazuyaQrCodeData || "";
globalThis.kazuyaQrType = globalThis.kazuyaQrType || "pairing";
globalThis.kazuyaManualStop = globalThis.kazuyaManualStop || false;

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Intercept console.log and other outputs to populate live dashboard terminal logs
const systemLogs: { id: string; timestamp: string; type: "info" | "success" | "warning" | "error"; text: string }[] = [
  {
    id: `log-bootstrap`,
    timestamp: new Date().toLocaleTimeString("pt-BR"),
    type: "info",
    text: "Painel de Controle Coruja Store Bot inicializado com sucesso. Pronto para gerenciar o WhatsApp."
  }
];

const originalWrite = process.stdout.write;
process.stdout.write = function (chunk: any, ...args: any[]) {
  const text = chunk.toString();
  // Strip ANSI color escape codes for clean web terminal interpretation
  const cleanText = text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, "");
  if (cleanText.trim()) {
    let type: "info" | "success" | "warning" | "error" = "info";
    
    if (cleanText.includes("SUCCESS") || cleanText.includes("✅")) {
      type = "success";
    } else if (cleanText.includes("WARNING") || cleanText.includes("警告") || cleanText.includes("⚠️")) {
      type = "warning";
    } else if (cleanText.includes("ERROR") || cleanText.trim().startsWith("Error:") || cleanText.includes("❌")) {
      type = "error";
    }

    systemLogs.push({
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      type,
      text: cleanText.trim()
    });

    if (systemLogs.length > 200) {
      systemLogs.shift();
    }
  }
  return originalWrite.apply(process.stdout, [chunk, ...args]);
};

// Start the Whatsapp Bot Connection
async function startKazuyaBot() {
  try {
    if (globalThis.kazuyaSocket) {
      console.log("[Coruja Store Bot] Já existe um socket ativo em execução.");
      return;
    }
    console.log("[Coruja Store Bot] Inicializando máquina de conexão WhatsApp...");
    globalThis.kazuyaConnectionStatus = "connecting";
    const socket = await connect();
    load(socket);
    globalThis.kazuyaSocket = socket;
  } catch (error: any) {
    console.error("[Coruja Store Bot] Erro crítico ao iniciar o bot:", error.message);
    globalThis.kazuyaConnectionStatus = "disconnected";
  }
}

// REST API Endpoints for Dashboard Control
app.get("/qr", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <title>Conector WhatsApp - Coruja Store Bot</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0b0f19; color: #f1f5f9; font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body class="flex flex-col items-center justify-center min-h-screen p-4 text-center">
  <div class="max-w-md w-full bg-[#111827] border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
    <!-- Accent lights -->
    <div class="absolute -top-10 -right-10 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl"></div>
    <div class="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>

    <div class="text-4xl mb-3">🪐</div>
    <h1 class="text-2xl font-black text-white tracking-tight mb-2">Aparelhos Conectados</h1>
    <p class="text-xs text-slate-400 mb-6 font-medium">Link de conexao instantanea do WhatsApp. Esta pagina atualiza em tempo real.</p>
    
    <!-- State: Loading -->
    <div id="status-loading" class="py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mx-auto"></div>
      <p class="text-sm mt-4 text-slate-400 font-mono">Verificando status de conexao...</p>
    </div>

    <!-- State: QR code ready -->
    <div id="status-qr" class="hidden">
      <div class="inline-block bg-white p-4.5 rounded-2xl mx-auto mb-4 shadow-xl border border-slate-700/50">
        <img id="qr-element" class="w-64 h-64 mx-auto block" alt="WhatsApp QR Code">
      </div>
      <div class="text-sm text-slate-200 font-bold mb-1 uppercase tracking-wider text-amber-400">Escaneie o QR Code no seu WhatsApp</div>
      <p class="text-xs text-slate-400 mb-4 leading-relaxed">Abra o WhatsApp &gt; <strong>Aparelhos Conectados</strong> &gt; Conectar um aparelho e aponte a camera.</p>
      <div class="text-xs text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/25 px-4 py-2 rounded-xl inline-block mt-1">
        🔄 Modulo ativo. O QR Code atualiza sozinho a cada expiracao.
      </div>
    </div>

    <!-- State: Pairing Code Ready -->
    <div id="status-pairing" class="hidden">
      <div class="py-6 px-4 bg-slate-900 border border-slate-800 rounded-2xl mb-4 text-center">
        <span id="pairing-code" class="font-mono text-3xl font-extrabold tracking-widest text-white">------</span>
      </div>
      <div class="text-xs text-slate-200 font-bold mb-1 uppercase tracking-wider text-amber-400">Inserir Codigo no WhatsApp</div>
      <p class="text-xs text-slate-400 mb-3 leading-relaxed">Digite o codigo acima no seu celular clicando em:<br><strong>Aparelhos Conectados &gt; Conectar com numero de telefone</strong></p>
    </div>

    <!-- State: Connected -->
    <div id="status-connected" class="hidden py-10">
      <div class="inline-flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded-full p-4.5 mb-4 border border-emerald-500/20">
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-emerald-400 mb-2">WhatsApp Conectado!</h2>
      <p class="text-sm text-slate-400">O bot esta ativo, integrado e pronto para responder no seu painel.</p>
    </div>

    <!-- State: Inactive -->
    <div id="status-inactive" class="hidden py-10">
      <div class="inline-flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-full p-4.5 mb-4 border border-rose-500/20">
        <svg class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 class="text-xl font-bold text-rose-400 mb-2">Bot Desativado</h2>
      <p class="text-sm text-slate-400">O bot esta pausado ou desligado. Acesse o painel principal e clique no botao de <strong>Iniciar Bot</strong> no topo direito para comecar.</p>
    </div>
  </div>

  <p class="text-[10px] text-slate-600 font-mono mt-8">Copyright © Coruja Store Bot — Protegido por Sessao Segura</p>

  <script>
    async function updateStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        
        document.getElementById('status-loading').classList.add('hidden');
        document.getElementById('status-qr').classList.add('hidden');
        document.getElementById('status-pairing').classList.add('hidden');
        document.getElementById('status-connected').classList.add('hidden');
        document.getElementById('status-inactive').classList.add('hidden');

        if (!data.botActive) {
          document.getElementById('status-inactive').classList.remove('hidden');
        } else if (data.connectionStatus === 'connected') {
          document.getElementById('status-connected').classList.remove('hidden');
        } else if (data.connectionStatus === 'connecting' && data.qrCodeData) {
          if (data.qrType === 'qr') {
            document.getElementById('status-qr').classList.remove('hidden');
            const qrImg = document.getElementById('qr-element');
            // If dataURL available use it, otherwise fall back to qrserver
            qrImg.src = data.qrImageUri || '/api/qr-image?t=' + Date.now();
          } else {
            document.getElementById('status-pairing').classList.remove('hidden');
            document.getElementById('pairing-code').textContent = data.qrCodeData;
          }
        } else {
          document.getElementById('status-loading').classList.remove('hidden');
        }
      } catch (err) {
        console.error("Erro ao sincronizar status:", err);
      }
    }

    // Poll every 3 seconds to ensure real-time reaction
    setInterval(updateStatus, 3000);
    updateStatus();
  </script>
</body>
</html>`);
});

app.get("/api/qr-image", async (req, res) => {
  if (globalThis.kazuyaQrCodeData) {
    try {
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      const qrBuffer = await QRCode.toBuffer(globalThis.kazuyaQrCodeData, { type: "png", width: 300, margin: 2 });
      return res.send(qrBuffer);
    } catch (err: any) {
      console.error("[Coruja Store Bot] Erro ao gerar QR Code como buffer:", err.message);
      res.status(500).send("Erro ao processar imagem do QR Code.");
    }
  } else {
    res.status(404).send("QR Code nao gerado ou indisponivel no momento.");
  }
});

app.get("/api/status", async (req, res) => {
  let qrImageUri = "";
  if (globalThis.kazuyaConnectionStatus === "connecting" && globalThis.kazuyaQrType === "qr" && globalThis.kazuyaQrCodeData) {
    try {
      qrImageUri = await QRCode.toDataURL(globalThis.kazuyaQrCodeData);
    } catch (err: any) {
      console.error("[Coruja Store Bot] Erro ao converter QR string para Data URL:", err.message);
    }
  }

  res.json({
    botActive: !!globalThis.kazuyaSocket,
    connectionStatus: globalThis.kazuyaConnectionStatus,
    qrCodeData: globalThis.kazuyaQrCodeData,
    qrType: globalThis.kazuyaQrType || "pairing",
    qrImageUri,
    botName: "Coruja Store Bot",
    botEmoji: "🪐"
  });
});

app.post("/api/toggle-bot", async (req, res) => {
  const { active } = req.body;
  if (active) {
    globalThis.kazuyaManualStop = false;
    if (!globalThis.kazuyaSocket) {
      // Clear past QR codes
      globalThis.kazuyaQrCodeData = "";
      globalThis.kazuyaQrType = "pairing";
      await startKazuyaBot();
    }
    res.json({ success: true, botActive: true, connectionStatus: globalThis.kazuyaConnectionStatus });
  } else {
    if (globalThis.kazuyaSocket) {
      try {
        globalThis.kazuyaManualStop = true;
        globalThis.kazuyaSocket.end();
      } catch (e) {}
      globalThis.kazuyaSocket = null;
      globalThis.kazuyaConnectionStatus = "disconnected";
      globalThis.kazuyaQrCodeData = "";
      globalThis.kazuyaQrType = "pairing";
    }
    console.log("[Coruja Store Bot] Conexão com o WhatsApp suspensa pelo usuário via Painel.");
    res.json({ success: true, botActive: false, connectionStatus: "disconnected" });
  }
});

// Reset Connection / Auth Session
app.post("/api/reset-session", async (req, res) => {
  try {
    console.log("[Coruja Store Bot] Solicitado reset completo de autenticação e cache...");
    
    if (globalThis.kazuyaSocket) {
      try {
        globalThis.kazuyaSocket.end();
      } catch (e) {}
      globalThis.kazuyaSocket = null;
    }
    
    globalThis.kazuyaConnectionStatus = "disconnected";
    globalThis.kazuyaQrCodeData = "";
    globalThis.kazuyaQrType = "pairing";

    const baileysFolder = path.resolve(
      process.cwd(),
      "takeshi-bot-main",
      "assets",
      "auth",
      "baileys"
    );

    if (fs.existsSync(baileysFolder)) {
      fs.rmSync(baileysFolder, { recursive: true, force: true });
      console.log("[Coruja Store Bot] Pasta de autenticação do Baileys apagada com sucesso.");
    }

    res.json({ success: true, message: "Sessão resetada com sucesso. Os dados antigos de autenticação foram apagados." });
  } catch (error: any) {
    console.error("[Coruja Store Bot] Erro ao resetar sessão:", error);
    res.status(500).json({ error: error.message || "Erro desconhecido ao resetar a sessão." });
  }
});

// Request QR / Pairing Code
app.post("/api/pair", async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: "Número de telefone é obrigatório." });
  }

  try {
    // If bot isn't initialized yet, start it
    if (!globalThis.kazuyaSocket) {
      await startKazuyaBot();
      // Wait momentarily for makeWASocket to construct
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    if (!globalThis.kazuyaSocket) {
      return res.status(500).json({ error: "Falha ao instanciar o socket do bot." });
    }

    console.log(`[Coruja Store Bot] Solicitando código de pareamento para o número: ${phoneNumber}`);
    const cleanNumber = phoneNumber.replace(/\D/g, "");
    const code = await globalThis.kazuyaSocket.requestPairingCode(cleanNumber);
    
    // Convert e.g., ABCDEFGH to AAAA-BBBB style (just split or keep original)
    const formattedCode = code ? (code.match(/.{1,4}/g)?.join("-") || code).toUpperCase() : "";
    globalThis.kazuyaQrCodeData = formattedCode;
    globalThis.kazuyaConnectionStatus = "connecting";
    globalThis.kazuyaQrType = "pairing";

    console.log(`[Coruja Store Bot] Código gerado com sucesso pelo WhatsApp: ${formattedCode}`);
    res.json({ success: true, code: formattedCode });
  } catch (error: any) {
    console.error("[Coruja Store Bot] Falha ao solicitar código de pareamento:", error.message);
    res.status(500).json({ error: error.message || "Erro desconhecido ao gerar o código de pareamento." });
  }
});

// Logs Endpoint
app.get("/api/logs", (req, res) => {
  res.json({ logs: systemLogs });
});

// Broadcast Message (Market Notification, Group Moderation Alerts, Custom Alarms)
app.post("/api/send-message", async (req, res) => {
  const { target, message } = req.body;
  if (!target || !message) {
    return res.status(400).json({ error: "Sua solicitação deve conter target (grupo ou número) e message." });
  }

  if (!globalThis.kazuyaSocket || globalThis.kazuyaConnectionStatus !== "connected") {
    return res.status(400).json({ error: "O bot está desconectado. Conecte-o antes de tentar enviar notificações." });
  }

  try {
    let jid = target.trim();
    // Auto format numbers: if it doesn't end with us.c.us or g.us, append it
    if (!jid.endsWith("@g.us") && !jid.endsWith("@s.whatsapp.net")) {
      jid = jid.replace(/\D/g, "");
      jid = `${jid}@s.whatsapp.net`;
    }

    console.log(`[Coruja Store Bot] Ativando estado de digitação simulação anti-ban para: ${jid}`);
    try {
      await globalThis.kazuyaSocket.sendPresenceUpdate("composing", jid);
    } catch (presenceErr) {
      console.warn("[Coruja Store Bot] Falha ao enviar presença (pode ser ignorado):", presenceErr);
    }

    // Calcula delay realista baseado no texto: base de 1.2s + fator por caractere + ruído randômico
    const typingDelay = Math.min(5500, Math.max(1500, 1000 + message.length * 10 + Math.floor(Math.random() * 800)));
    await new Promise((resolve) => setTimeout(resolve, typingDelay));

    console.log(`[Coruja Store Bot] Enviando mensagem institucional de marketing para: ${jid}`);
    await globalThis.kazuyaSocket.sendMessage(jid, { text: message });
    
    console.log(`[Coruja Store Bot | SUCCESS] Mensagem entregue com sucesso para: ${jid}`);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Coruja Store Bot] Erro ao disparar mensagem:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Triggers CRUD connecting directly to bot auto-responder JSON database
app.get("/api/triggers", (req, res) => {
  try {
    const rawItems = listAutoResponderItems();
    // Map to frontend Trigger structure
    const mapped = rawItems.map((item: any) => ({
      id: `trigger-item-${item.key}`,
      keyword: item.match,
      reply: item.answer,
      isActive: true,
      category: "Geral"
    }));
    res.json({ triggers: mapped });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/triggers", (req, res) => {
  const { keyword, reply } = req.body;
  if (!keyword || !reply) {
    return res.status(400).json({ error: "Keyword e Reply são obrigatórios." });
  }

  try {
    const success = addAutoResponderItem(keyword.trim(), reply.trim());
    if (!success) {
      return res.status(400).json({ error: "Este gatilho/keyword já está cadastrado no banco." });
    }
    console.log(`[Coruja Store Bot] Novo gatinho/gatilho adicionado com sucesso: "${keyword}"`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/triggers", (req, res) => {
  const idStr = req.query.id as string;
  if (!idStr) {
    return res.status(400).json({ error: "ID do gatilho é obrigatório para exclusão." });
  }

  try {
    // Extract key from id string e.g., 'trigger-item-1' -> 1
    const key = parseInt(idStr.replace("trigger-item-", ""), 10);
    if (isNaN(key)) {
      return res.status(400).json({ error: "ID de formato inválido." });
    }

    const success = removeAutoResponderItemByKey(key);
    if (!success) {
      return res.status(404).json({ error: "Gatilho não encontrado no banco de dados." });
    }
    console.log(`[Coruja Store Bot] Gatilho id #${key} excluído permanentemente.`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/triggers", (req, res) => {
  const { id, keyword, reply } = req.body;
  if (!id || !keyword || !reply) {
    return res.status(400).json({ error: "ID, keyword e reply são obrigatórios para alteração." });
  }

  try {
    const key = parseInt(id.replace("trigger-item-", ""), 10);
    if (isNaN(key)) {
      return res.status(400).json({ error: "ID de formato inválido." });
    }

    const success = updateAutoResponderItemByKey(key, keyword.trim(), reply.trim());
    if (!success) {
      return res.status(404).json({ error: "Gatilho para alteração não foi encontrado." });
    }
    console.log(`[Coruja Store Bot] Gatilho id #${key} alterado com sucesso para "${keyword}"`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Real Group configuration endpoints (anti-link, welcomes, auto-sticker, onlyAdmins, etc.)
app.get("/api/settings/group", (req, res) => {
  const jid = (req.query.jid as string) || "120363290@g.us";
  try {
    res.json({
      jid,
      antiLink: isActiveAntiLinkGroup(jid),
      autoSticker: isActiveAutoStickerGroup(jid),
      welcome: isActiveWelcomeGroup(jid),
      exit: isActiveExitGroup(jid),
      autoResponder: isActiveAutoResponderGroup(jid),
      onlyAdmins: isActiveOnlyAdmins(jid),
      prefix: getPrefix(jid),
      groupActive: isActiveGroup(jid)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/group", (req, res) => {
  const { jid, property, active } = req.body;
  if (!jid || !property) {
    return res.status(400).json({ error: "Parâmetros jid e property são obrigatórios." });
  }

  try {
    switch (property) {
      case "antiLink":
        if (active) activateAntiLinkGroup(jid);
        else deactivateAntiLinkGroup(jid);
        break;
      case "autoSticker":
        if (active) activateAutoStickerGroup(jid);
        else deactivateAutoStickerGroup(jid);
        break;
      case "welcome":
        if (active) activateWelcomeGroup(jid);
        else deactivateWelcomeGroup(jid);
        break;
      case "exit":
        if (active) activateExitGroup(jid);
        else deactivateExitGroup(jid);
        break;
      case "autoResponder":
        if (active) activateAutoResponderGroup(jid);
        else deactivateAutoResponderGroup(jid);
        break;
      case "onlyAdmins":
        if (active) activateOnlyAdmins(jid);
        else deactivateOnlyAdmins(jid);
        break;
      case "groupActive":
        if (active) activateGroup(jid);
        else deactivateGroup(jid);
        break;
      default:
        return res.status(400).json({ error: "Propriedade de grupo inválida." });
    }
    console.log(`[Coruja Store Bot] Configuração ${property} definida para ${active} no grupo ${jid}`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/prefix", (req, res) => {
  const { jid, prefix } = req.body;
  if (!jid || prefix === undefined) {
    return res.status(400).json({ error: "Parâmetros jid e prefix são obrigatórios." });
  }
  try {
    setPrefix(jid, prefix.trim());
    console.log(`[Coruja Store Bot] Prefixo customizado para o grupo ${jid} definido como "${prefix}"`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/settings/token", (req, res) => {
  try {
    res.json({ token: getSpiderApiToken() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/settings/token", (req, res) => {
  const { token } = req.body;
  if (token === undefined) {
    return res.status(400).json({ error: "Token é obrigatório." });
  }
  try {
    setSpiderApiToken(token.trim());
    console.log("[Coruja Store Bot] Token da Spider X API atualizado com competência no banco de dados.");
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// JSON Config path helper
const configFilePath = path.resolve(process.cwd(), "takeshi-bot-main", "database", "config.json");

function readBotConfig() {
  try {
    if (fs.existsSync(configFilePath)) {
      return JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    }
  } catch (err: any) {
    console.error("Erro ao ler config.json:", err.message);
  }
  return {};
}

function writeBotConfig(data: any) {
  try {
    const dir = path.dirname(configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err: any) {
    console.error("Erro ao gravar config.json:", err.message);
    return false;
  }
}

// Commands Directory scanner
const commandsDir = path.resolve(process.cwd(), "takeshi-bot-main", "src", "commands");

function getCommandFiles(dir: string, baseDir: string = commandsDir): any[] {
  let results: any[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of list) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...getCommandFiles(fullPath, baseDir));
    } else if (item.isFile() && (item.name.endsWith(".js") || item.name.endsWith(".ts"))) {
      const relPath = path.relative(baseDir, fullPath);
      let name = item.name;
      let commandsList: string[] = [];
      let description = "Sem descrição cadastrada.";
      try {
        const fileContent = fs.readFileSync(fullPath, "utf8");
        const nameMatch = fileContent.match(/name\s*:\s*["'`](.*?)["'`]/);
        if (nameMatch) name = nameMatch[1];

        const descMatch = fileContent.match(/description\s*:\s*["'`](.*?)["'`]/);
        if (descMatch) description = descMatch[1];

        const cmdMatch = fileContent.match(/commands\s*:\s*\[([\s\S]*?)\]/);
        if (cmdMatch) {
          commandsList = cmdMatch[1]
            .split(",")
            .map((c: string) => c.replace(/["'`]/g, "").trim())
            .filter((c: string) => c.length > 0);
        }
      } catch (err) {}

      results.push({
        fileName: item.name,
        relPath,
        name,
        category: path.basename(dir),
        commands: commandsList.length ? commandsList : [item.name.replace(/\.(js|ts)$/, "")],
        description
      });
    }
  }
  return results;
}

// Fetch participating groups on connected bot
app.get("/api/groups", async (req, res) => {
  const defaultGroups = [
    { jid: "default", name: "🪐 Geral (Todos os Grupos)" },
    { jid: "120363290001@g.us", name: "💎 Grupo VIP" },
    { jid: "120363290002@g.us", name: "📣 Canal de Anúncios" },
    { jid: "120363290003@g.us", name: "💬 Chat de Vendas & Suporte" }
  ];

  if (globalThis.kazuyaSocket && globalThis.kazuyaConnectionStatus === "connected") {
    try {
      const bGroups = await globalThis.kazuyaSocket.groupFetchAllParticipating();
      const list = Object.values(bGroups).map((g: any) => ({
        jid: g.id || g.jid,
        name: g.subject || g.name || "Grupo sem nome"
      }));

      const merged = [
        { jid: "default", name: "🪐 Geral (Todos os Grupos)" },
        ...list
      ];
      return res.json(merged);
    } catch (e: any) {
      console.error("[Coruja Store Bot] Erro ao buscar grupos ativos:", e.message);
      return res.json(defaultGroups);
    }
  }
  return res.json(defaultGroups);
});

// Dynamic Bot & Integration configurations
let recursiveAdsTimer: NodeJS.Timeout | null = null;
let recentAdsSentIds: string[] = [];

const defaultProducts = [
  {
    id: "1",
    name: "Coruja Store Bot - Licença Vitalícia",
    price: "199.90",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500",
    link: "https://takeshibot.com/vitalicia"
  },
  {
    id: "2",
    name: "Hospedagem Cloud Run VPS Premium",
    price: "49.90",
    imageUrl: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=500",
    link: "https://takeshibot.com/vps"
  },
  {
    id: "3",
    name: "Banco de Dados PostgreSQL Auto-Scaling",
    price: "89.00",
    imageUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=500",
    link: "https://takeshibot.com/db"
  }
];

async function triggerRandomAdBroadcast() {
  const currentConfig = readBotConfig();
  const products = currentConfig.shop_products || defaultProducts;
  if (!products.length) {
    console.log("[Recorrente] Nenhum produto cadastrado no banco para anúncio recorrente.");
    return false;
  }

  let receiverJid = currentConfig.recursive_ads_receiver_jid || "default";
  if (!globalThis.kazuyaSocket || globalThis.kazuyaConnectionStatus !== "connected") {
    console.log("[Recorrente] Erro: Bot desconectado. Falha ao despachar anúncio automático.");
    return false;
  }

  // Resolve JID if default
  if (receiverJid === "default") {
    try {
      const groups = await globalThis.kazuyaSocket.groupFetchAllParticipating();
      const firstGroup = Object.keys(groups)[0];
      if (firstGroup) {
        receiverJid = firstGroup;
      } else {
        receiverJid = globalThis.kazuyaSocket.user.id;
      }
    } catch (e) {
      receiverJid = globalThis.kazuyaSocket.user.id;
    }
  }

  // Filter pool using recent history to avoid repetition
  let pool = products.filter((p: any) => !recentAdsSentIds.includes(p.id));
  if (pool.length === 0) {
    console.log("[Recorrente] Rotação concluída! Reiniciando ciclo de produtos para evitar repetições imediatas.");
    recentAdsSentIds = [];
    pool = products;
  }

  // Select random product
  const product = pool[Math.floor(Math.random() * pool.length)];
  recentAdsSentIds.push(product.id);

  console.log(`[Recorrente] Disparando anúncio de "${product.name}" para ${receiverJid}...`);

  // Format ad copy
  const adMessage = 
    `📢 *OFERTA ESPECIAL DA NOSSA LOJA* 📢\n\n` +
    `*🔥 ${product.name}*\n\n` +
    `💰 *Preço Especial:* R$ ${product.price}\n\n` +
    `👉 Aproveite agora no link abaixo:\n` +
    `🔗 ${product.link || "https://takeshibot.com"}\n\n` +
    `_Promoção por tempo limitado!_ 🪐🛒`;

  // Human typing presence delay simulation
  try {
    await globalThis.kazuyaSocket.sendPresenceUpdate("composing", receiverJid);
  } catch (err) {}
  await new Promise(r => setTimeout(r, 2000 + Math.random() * 1500));

  // Determine message package (with image attachment or simple text)
  if (product.imageUrl && (product.imageUrl.startsWith("http://") || product.imageUrl.startsWith("https://"))) {
    await globalThis.kazuyaSocket.sendMessage(receiverJid, {
      image: { url: product.imageUrl },
      caption: adMessage
    });
  } else {
    await globalThis.kazuyaSocket.sendMessage(receiverJid, { text: adMessage });
  }

  console.log(`[Recorrente] ✅ Anúncio do produto "${product.name}" enviado com sucesso!`);
  return true;
}

function startRecursiveAdsLoop() {
  if (recursiveAdsTimer) {
    clearInterval(recursiveAdsTimer);
    recursiveAdsTimer = null;
  }
  
  const currentConfig = readBotConfig();
  if (!currentConfig.recursive_ads_enabled) {
    console.log("[Recorrente] Sistema de mensagens recorrentes de produtos desativado.");
    return;
  }
  
  const intervalMinutes = Number(currentConfig.recursive_ads_interval_minutes) || 15;
  const ms = intervalMinutes * 60000;
  
  console.log(`[Recorrente] Loop ativado. Disparando anúncio automático a cada ${intervalMinutes} minutos.`);
  
  recursiveAdsTimer = setInterval(() => {
    triggerRandomAdBroadcast().catch(err => {
      console.error("[Recorrente] Falha ao enviar anúncio recorrente programado:", err.message);
    });
  }, ms);
}

// REST Webhook integration endpoint
app.post("/api/webhooks/shop", async (req, res) => {
  const currentConfig = readBotConfig();
  if (currentConfig.webhook_enabled === false) {
    console.log("[Webhook] Recebida postagem em /api/webhooks/shop, mas o webhook de venda está desligado.");
    return res.status(400).json({ error: "Webhook de vendas desativado." });
  }

  const body = req.body || {};
  
  // Extract fields mirroring standard gateways (WooCommerce, Shopify, Mercado Pago, Stripe, Yampi)
  const orderId = body.order_id || body.id || `PED${Math.floor(100000 + Math.random() * 900000)}`;
  const customerName = body.customer_name || (body.customer ? `${body.customer.first_name || ""} ${body.customer.last_name || ""}`.trim() : null) || body.name || "Ryan Vaz";
  const customerEmail = body.customer_email || (body.customer ? body.customer.email : null) || body.email || "ryanvaz07@gmail.com";
  const amount = body.amount || body.total || body.total_price || "149.90";
  const gateway = body.gateway || body.payment_gateway || body.payment_method_title || "Mercado Pago (Cartão)";
  const productName = body.product_name || (body.line_items && body.line_items[0] ? body.line_items[0].name : null) || "Coruja Store Bot Premium Kit";
  const status = body.status || "approved";

  // Pretty Discord Webhook style container logs
  console.log(`\n┌────────────────────────────────────────────────────────┐`);
  console.log(`│             🛒 NOVO WEBHOOK DE VENDA RECEBIDO          │`);
  console.log(`├────────────────────────────────────────────────────────┤`);
  console.log(`│ Pedido ID   : #${orderId.toString().padEnd(41)} │`);
  console.log(`│ Comprador   : ${customerName.toString().padEnd(41)} │`);
  console.log(`│ E-mail      : ${customerEmail.toString().padEnd(41)} │`);
  console.log(`│ Gateway     : ${gateway.toString().padEnd(41)} │`);
  console.log(`│ Produto     : ${productName.toString().padEnd(41)} │`);
  console.log(`│ Valor total : R$ ${amount.toString().padEnd(38)} │`);
  console.log(`│ Status      : ${status.toUpperCase().toString().padEnd(41)} │`);
  console.log(`└────────────────────────────────────────────────────────┘\n`);

  let receiverJid = currentConfig.webhook_receiver_jid || "default";

  if (globalThis.kazuyaSocket && globalThis.kazuyaConnectionStatus === "connected") {
    try {
      if (receiverJid === "default") {
        const groups = await globalThis.kazuyaSocket.groupFetchAllParticipating();
        const firstGroup = Object.keys(groups)[0];
        if (firstGroup) {
          receiverJid = firstGroup;
        } else {
          receiverJid = globalThis.kazuyaSocket.user.id;
        }
      }

      // Format WhatsApp rich copy
      const alertMessage = 
        `============================\n` +
        `🛒 *NOVA VENDA REPRISADA!* 🛒\n` +
        `============================\n\n` +
        `*👤 Comprador:* ${customerName}\n` +
        `*📧 E-mail:* ${customerEmail}\n` +
        `*📦 Pedido ID:* #${orderId}\n` +
        `*🛍️ Produto:* ${productName}\n` +
        `*💰 Valor:* R$ ${amount}\n` +
        `*💳 Gateway:* ${gateway}\n` +
        `*⚡ Status:* Aprovado ✅\n\n` +
        `============================\n\n` +
        `_Notificação automatizada via *${currentConfig.shop_name || "Coruja Store"}* (Coruja Store Bot)_`;

      // Simular presença anti-ban
      try {
        await globalThis.kazuyaSocket.sendPresenceUpdate("composing", receiverJid);
      } catch (presErr) {}
      await new Promise(r => setTimeout(r, 1500));

      await globalThis.kazuyaSocket.sendMessage(receiverJid, { text: alertMessage });
      console.log(`[Webhook] ✅ Alerta de venda enviado com absoluto sucesso para ${receiverJid}!`);
    } catch (sendErr: any) {
      console.error("[Webhook] Erro ao despachar notificação pelo WhatsApp:", sendErr.message);
    }
  } else {
    console.log("[Webhook] O Bot está offline na sessão. Alerta exibido apenas no Console.");
  }

  res.json({ success: true, message: "Webhook processado!", orderId });
});

// Trigger a manual random product broadcast
app.post("/api/shop/broadcast-random", async (req, res) => {
  try {
    const executed = await triggerRandomAdBroadcast();
    if (executed) {
      res.json({ success: true, message: "Anúncio de produto disparado com sucesso!" });
    } else {
      res.status(400).json({ error: "Falha ao disparar. Certifique-se de que o Bot está conectado e há produtos cadastrados." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET configuration
app.get("/api/bot-config", (req, res) => {
  try {
    const currentConfig = readBotConfig();
    const merged = {
      prefix: currentConfig.prefix || "/",
      bot_name: currentConfig.bot_name || "Coruja Store Bot",
      bot_emoji: currentConfig.bot_emoji || "🪐",
      openai_api_key: currentConfig.openai_api_key || "",
      spider_api_token: currentConfig.spider_api_token || "seu_token_aqui",
      linker_api_key: currentConfig.linker_api_key || "seu_token_aqui",
      only_group_id: currentConfig.only_group_id || "",
      developer_mode: !!currentConfig.developer_mode,
      shop_name: currentConfig.shop_name || "Admin Store",
      shop_webhook: currentConfig.shop_webhook || "",
      shop_api_key: currentConfig.shop_api_key || "",
      order_notification_msg: currentConfig.order_notification_msg || "Olá! Desejamos avisar que seu pedido #{ORDER_ID} foi postado ou atualizado com sucesso! 🪐📦",
      welcome_image_url: currentConfig.welcome_image_url || "/takeshi-bot.png",
      webhook_receiver_jid: currentConfig.webhook_receiver_jid || "default",
      webhook_enabled: currentConfig.webhook_enabled !== undefined ? !!currentConfig.webhook_enabled : true,
      recursive_ads_enabled: !!currentConfig.recursive_ads_enabled,
      recursive_ads_interval_minutes: currentConfig.recursive_ads_interval_minutes || 15,
      recursive_ads_receiver_jid: currentConfig.recursive_ads_receiver_jid || "default",
      shop_products: currentConfig.shop_products || defaultProducts
    };
    res.json(merged);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bot-config", (req, res) => {
  try {
    const raw = req.body;
    const current = readBotConfig();
    const updated = {
      ...current,
      prefix: raw.prefix !== undefined ? raw.prefix : current.prefix,
      bot_name: raw.bot_name !== undefined ? raw.bot_name : current.bot_name,
      bot_emoji: raw.bot_emoji !== undefined ? raw.bot_emoji : current.bot_emoji,
      openai_api_key: raw.openai_api_key !== undefined ? raw.openai_api_key : current.openai_api_key,
      spider_api_token: raw.spider_api_token !== undefined ? raw.spider_api_token : current.spider_api_token,
      linker_api_key: raw.linker_api_key !== undefined ? raw.linker_api_key : current.linker_api_key,
      only_group_id: raw.only_group_id !== undefined ? raw.only_group_id : current.only_group_id,
      developer_mode: raw.developer_mode !== undefined ? !!raw.developer_mode : current.developer_mode,
      shop_name: raw.shop_name !== undefined ? raw.shop_name : current.shop_name,
      shop_webhook: raw.shop_webhook !== undefined ? raw.shop_webhook : current.shop_webhook,
      shop_api_key: raw.shop_api_key !== undefined ? raw.shop_api_key : current.shop_api_key,
      order_notification_msg: raw.order_notification_msg !== undefined ? raw.order_notification_msg : current.order_notification_msg,
      welcome_image_url: raw.welcome_image_url !== undefined ? raw.welcome_image_url : current.welcome_image_url,
      webhook_receiver_jid: raw.webhook_receiver_jid !== undefined ? raw.webhook_receiver_jid : current.webhook_receiver_jid,
      webhook_enabled: raw.webhook_enabled !== undefined ? !!raw.webhook_enabled : current.webhook_enabled,
      recursive_ads_enabled: raw.recursive_ads_enabled !== undefined ? !!raw.recursive_ads_enabled : current.recursive_ads_enabled,
      recursive_ads_interval_minutes: raw.recursive_ads_interval_minutes !== undefined ? Number(raw.recursive_ads_interval_minutes) : current.recursive_ads_interval_minutes,
      recursive_ads_receiver_jid: raw.recursive_ads_receiver_jid !== undefined ? raw.recursive_ads_receiver_jid : current.recursive_ads_receiver_jid,
      shop_products: raw.shop_products !== undefined ? raw.shop_products : current.shop_products
    };

    writeBotConfig(updated);
    console.log("[Coruja Store Bot] Configurações de comportamento e loja salvas com sucesso!");
    
    // Regovern standard recursive ads timer loop on state post
    startRecursiveAdsLoop();
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// STORE DIRECT REST API - FOR TAKESHI BOT
// ==========================================
const BOT_TOKEN = "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}";
const storeMockDbPath = path.resolve(process.cwd(), "takeshi-bot-main", "database", "store_mock_db.json");

function readStoreMockDb() {
  const defaultDb = {
    customers: {
      "ryanvaz07@gmail.com": {
        email: "ryanvaz07@gmail.com",
        name: "Ryan Vaz",
        balance: 150.00,
        transactions: [
          { id: "TX1001", amount: 50.00, type: "credit", reason: "Bônus de Boas-vindas", date: "2026-06-12 18:30" },
          { id: "TX1002", amount: -199.90, type: "debit", reason: "Compra de Licença Vitalícia", date: "2026-06-13 01:00" },
          { id: "TX1003", amount: 299.90, type: "credit", reason: "Recarga Pix", date: "2026-06-13 01:10" }
        ]
      }
    },
    orders: {
      "PED123456": {
        id: "PED123456",
        product: "Coruja Store Bot - Licença Vitalícia",
        amount: "199.90",
        status: "approved",
        asset_data: "CHAVE-API-LICENCA-VITALICIA-TK-998877665544X"
      },
      "PED654321": {
        id: "PED654321",
        product: "Hospedagem Cloud Run VPS Premium",
        amount: "49.90",
        status: "pending",
        asset_data: "Sem licença (Aguardando Pagamento)"
      }
    },
    recent_sales: [
      {
        id: "SALE-101",
        email: "ryanvaz07@gmail.com",
        amount: "199.90",
        productName: "Coruja Store Bot - Licença Vitalícia",
        timestamp: new Date().toISOString()
      }
    ]
  };

  try {
    if (fs.existsSync(storeMockDbPath)) {
      return JSON.parse(fs.readFileSync(storeMockDbPath, "utf8"));
    }
  } catch (err: any) {
    console.error("[Store Mock DB] Erro ao carregar banco do site:", err.message);
  }

  // If not exist, write default
  try {
    fs.mkdirSync(path.dirname(storeMockDbPath), { recursive: true });
    fs.writeFileSync(storeMockDbPath, JSON.stringify(defaultDb, null, 2), "utf8");
  } catch (err: any) {
    console.error("[Store Mock DB] Erro ao criar banco padrão do site:", err.message);
  }
  return defaultDb;
}

function writeStoreMockDb(data: any) {
  try {
    fs.mkdirSync(path.dirname(storeMockDbPath), { recursive: true });
    fs.writeFileSync(storeMockDbPath, JSON.stringify(data, null, 2), "utf8");
  } catch (err: any) {
    console.error("[Store Mock DB] Erro ao salvar banco do site:", err.message);
  }
}

function verifyBotToken(req: any, res: any, next: any) {
  const tokenHeader = req.headers["x-bot-token"];
  if (!tokenHeader) {
    return res.status(401).json({ error: "X-Bot-Token obrigatório nos headers." });
  }
  if (tokenHeader !== BOT_TOKEN && tokenHeader !== BOT_TOKEN.replace(/[{}]/g, "")) {
    return res.status(401).json({ error: "X-Bot-Token inválido ou incorreto." });
  }
  next();
}

// 1. CONSULTA DE PRODUTOS/CATÁLOGO
app.get("/api/bot/products", verifyBotToken, (req, res) => {
  try {
    const currentConfig = readBotConfig();
    const products = currentConfig.shop_products || defaultProducts;
    const mapped = products.map((p: any) => ({
      id: p.id || "1",
      name: p.name || "Sem Nome",
      price: p.price || "0.00",
      category: p.category || "Geral",
      stock: p.stock !== undefined ? p.stock : 25
    }));
    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. VERIFICAR PEDIDOS (SUPORTE DE ENTREGAS)
app.get("/api/bot/order/:orderId", verifyBotToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const db = readStoreMockDb();
    let order = db.orders[orderId];

    // Se o pedido não existir, criamos um mock aprovado para facilitar testes imediatos!
    if (!order) {
      order = {
        id: orderId,
        product: "Coruja Store Bot - Licença Vitalícia",
        amount: "199.90",
        status: "approved",
        asset_data: `CHAVE-API-LICENCA-VITALICIA-TK-${orderId}-OK`
      };
      db.orders[orderId] = order;
      writeStoreMockDb(db);
    }

    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CONSULTAR CARTÃO/CADASTRO DO CLIENTE
app.get("/api/bot/customer/:email", verifyBotToken, (req, res) => {
  try {
    const { email } = req.params;
    const db = readStoreMockDb();
    let customer = db.customers[email];

    // Se o cliente não existir, inicializa perfil com saldo simbólico de R$ 0.00 para testes
    if (!customer) {
      customer = {
        email: email,
        name: email.split("@")[0].replace(/[._-]/g, " "),
        balance: 0.00,
        transactions: []
      };
      db.customers[email] = customer;
      writeStoreMockDb(db);
    }

    res.json(customer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. RECARGA VIA BOT
app.post("/api/bot/recharge", verifyBotToken, (req, res) => {
  try {
    const { email, amount, reason } = req.body;
    if (!email || amount === undefined) {
      return res.status(400).json({ error: "Campos 'email' e 'amount' são obrigatórios no body." });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ error: "O campo 'amount' precisa ser um número decimal válido." });
    }

    const db = readStoreMockDb();
    let customer = db.customers[email];
    if (!customer) {
      customer = {
        email: email,
        name: email.split("@")[0].replace(/[._-]/g, " "),
        balance: 0.00,
        transactions: []
      };
    }

    customer.balance = parseFloat((customer.balance + amountNum).toFixed(2));
    
    const txId = `TX${Math.floor(1000 + Math.random() * 9000)}`;
    const newTx = {
      id: txId,
      amount: amountNum,
      type: amountNum >= 0 ? "credit" : "debit",
      reason: reason || "Recarga no WhatsApp",
      date: new Date().toISOString().replace("T", " ").substring(0, 16)
    };
    customer.transactions.unshift(newTx);
    if (customer.transactions.length > 5) {
      customer.transactions = customer.transactions.slice(0, 5);
    }

    db.customers[email] = customer;
    writeStoreMockDb(db);

    res.json({
      success: true,
      message: `Recarga de R$ ${amountNum.toFixed(2)} liberada com sucesso!`,
      newBalance: customer.balance,
      customer
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// SIMULAÇÃO DE VENDAS (AÇÕES RÁPIDAS NO PAINEL)
app.post("/api/shop/simulate-sale", (req, res) => {
  try {
    const db = readStoreMockDb();
    const currentConfig = readBotConfig();
    const products = currentConfig.shop_products || defaultProducts;
    const randomProduct = products[Math.floor(Math.random() * products.length)] || defaultProducts[0];

    const saleId = `VENDA-${Math.floor(100000 + Math.random() * 900000)}`;
    const newSale = {
      id: saleId,
      email: req.body.email || "ryanvaz07@gmail.com",
      amount: req.body.amount || randomProduct.price || "149.90",
      productName: req.body.product_name || randomProduct.name,
      timestamp: new Date().toISOString()
    };

    db.recent_sales.push(newSale);
    if (db.recent_sales.length > 50) {
      db.recent_sales.shift();
    }

    writeStoreMockDb(db);
    console.log(`[Simulator] Nova venda #${saleId} simulada e gravada com sucesso!`);
    res.json({ success: true, sale: newSale });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Commands listing and file content editor APIs
app.get("/api/commands", (req, res) => {
  try {
    const list = getCommandFiles(commandsDir);
    res.json({ success: true, commands: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/commands/content", (req, res) => {
  const relPath = req.query.path as string;
  if (!relPath) return res.status(400).json({ error: "Parâmetro path é obrigatório." });

  try {
    const fullPath = path.resolve(commandsDir, relPath);
    if (!fullPath.startsWith(commandsDir)) {
      return res.status(403).json({ error: "Acesso de diretório inválido." });
    }
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "Arquivo de comando inexistente." });
    }
    res.json({ success: true, content: fs.readFileSync(fullPath, "utf8") });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/commands/content", (req, res) => {
  const { path: relPath, content } = req.body;
  if (!relPath || content === undefined) {
    return res.status(400).json({ error: "Parâmetros path e content são obrigatórios." });
  }
  try {
    const fullPath = path.resolve(commandsDir, relPath);
    if (!fullPath.startsWith(commandsDir)) {
      return res.status(403).json({ error: "Acesso de diretório inválido." });
    }
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`[Coruja Store Bot] Comando "${relPath}" foi editado e salvo com sucesso do Painel.`);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Integrate Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Support React SPA router
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n======================================================`);
    console.log(`🪐 CORUJA STORE BOT - PAINEL ONLINE EM: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
  });
}

// Unified async bootstrap sequence to ensure DB sync completes before connection
async function bootstrap() {
  // 1. Initialize PostgreSQL dynamic file synchronization (Restore step)
  await initDbSync();

  // 2. Auto-boot Coruja Store Bot WhatsApp connection
  console.log("[Coruja Store Bot] Inicializando auto-boot da conexão WhatsApp...");
  await startKazuyaBot().catch((err) => {
    console.error("[Coruja Store Bot] Falha no auto-boot inicial:", err.message);
  });

  // 3. Initialise the non-repeating recurrent product ad campaigns
  startRecursiveAdsLoop();

  // 4. Start HTTP Server
  await startServer();
}

bootstrap().catch((err) => {
  console.error("[Bootstrap] Erro crítico na inicialização geral:", err);
});

