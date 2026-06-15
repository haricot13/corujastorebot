/**
 * Script de
 * inicialização do bot.
 *
 * Este script é
 * responsável por
 * iniciar a conexão
 * com o WhatsApp.
 *
 * Não é recomendado alterar
 * este arquivo,
 * a menos que você saiba
 * o que está fazendo.
 *
 * @author Dev Gui
 */
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  isJidNewsletter,
  isJidStatusBroadcast,
  useMultiFileAuthState,
} from "baileys";
import NodeCache from "node-cache";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { PREFIX, TEMP_DIR } from "./config.js";
import { load } from "./loader.js";
import { badMacHandler } from "./utils/badMacHandler.js";
import { onlyNumbers, question } from "./utils/index.js";
import {
  bannerLog,
  errorLog,
  infoLog,
  successLog,
  warningLog,
} from "./utils/logger.js";

// No local path resolution needed here, process.cwd() handles it.

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const logger = pino(
  { timestamp: () => `,"time":"${new Date().toJSON()}"` },
  pino.destination(path.join(TEMP_DIR, "wa-logs.txt")),
);

logger.level = "error";

const msgRetryCounterCache = new NodeCache();

function formatPairingCode(code) {
  if (!code) return code;

  return code?.match(/.{1,4}/g)?.join("-") || code;
}

function clearScreenWithBanner() {
  console.clear();
  bannerLog();
}

// ==========================================
// STORE RECENTS SALES POLLING SYSTEM (ANTI-WEBHOOK)
// ==========================================
let salesIntervalId = null;
let notifiedSalesIds = new Set();
let isFirstRun = true;

const NOTIFIED_PAGES_JSON = path.resolve(process.cwd(), "takeshi-bot-main", "database", "notified_sales_ids.json");

// Carrega os IDs persistidos na memória
try {
  if (fs.existsSync(NOTIFIED_PAGES_JSON)) {
    const backupArray = JSON.parse(fs.readFileSync(NOTIFIED_PAGES_JSON, "utf8"));
    if (Array.isArray(backupArray)) {
      backupArray.forEach(id => notifiedSalesIds.add(String(id)));
      isFirstRun = false; // Se já temos dados históricos salvos, não precisamos de proteção cega de primeiro boot
    }
  }
} catch (e) {
  errorLog(`[Pooling Vendas] Falha ao carregar backup de IDs de venda: ${e.message}`);
}

function persistNotifiedSales() {
  try {
    const dir = path.dirname(NOTIFIED_PAGES_JSON);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(NOTIFIED_PAGES_JSON, JSON.stringify(Array.from(notifiedSalesIds), null, 2), "utf8");
  } catch (e) {
    errorLog(`[Pooling Vendas] Falha ao salvar backup de IDs de venda: ${e.message}`);
  }
}

function stopSalesPooling() {
  if (salesIntervalId) {
    clearInterval(salesIntervalId);
    salesIntervalId = null;
    successLog("[Pooling Vendas] Parando tarefa de consulta periódica de vendas.");
  }
}

async function startSalesPooling(socket) {
  stopSalesPooling();

  const fetchRecentSales = async () => {
    try {
      let config = {};
      try {
        const configPath = path.resolve(process.cwd(), "takeshi-bot-main", "database", "config.json");
        if (fs.existsSync(configPath)) {
          config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        }
      } catch (e) {}

      let targetUrl = "http://localhost:3000/api/bot/recent-sales";
      let requestHeaders = {
        "X-Bot-Token": "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}"
      };

      // Se o usuário configurou uma URL de API de vendas externa, faz polling dela!
      if (config.shop_webhook && config.shop_webhook.startsWith("http")) {
        targetUrl = config.shop_webhook;
        requestHeaders = {
          "Accept": "application/json",
          "Content-Type": "application/json"
        };
        if (config.shop_api_key) {
          requestHeaders["Authorization"] = `Bearer ${config.shop_api_key}`;
          requestHeaders["X-Api-Key"] = config.shop_api_key;
          requestHeaders["x-api-key"] = config.shop_api_key;
          requestHeaders["X-Bot-Token"] = config.shop_api_key;
        }
      }

      const response = await fetch(targetUrl, {
        headers: requestHeaders
      });

      if (!response.ok) {
        return;
      }

      let sales = await response.json();

      // Adaptador Dinâmico de Payloads - suporta arrays diretos ou objetos aninhados (.sales, .orders, .data, .vendas, .payload)
      if (sales && !Array.isArray(sales)) {
        if (Array.isArray(sales.sales)) {
          sales = sales.sales;
        } else if (Array.isArray(sales.orders)) {
          sales = sales.orders;
        } else if (Array.isArray(sales.data)) {
          sales = sales.data;
        } else if (Array.isArray(sales.vendas)) {
          sales = sales.vendas;
        } else if (Array.isArray(sales.compras)) {
          sales = sales.compras;
        } else if (Array.isArray(sales.results)) {
          sales = sales.results;
        } else if (Array.isArray(sales.payload)) {
          sales = sales.payload;
        } else if (Array.isArray(sales.body)) {
          sales = sales.body;
        } else if (typeof sales === "object") {
          sales = [sales]; // Se for um único objeto JSON de venda, envelopa
        }
      }

      if (!Array.isArray(sales)) return;

      // Se for a primeira execução na sessão e o banco de dados local estiver completamente zerado,
      // semeia quase todas as vendas mas permite que as últimas 1 ou 2 mais recentes sejam notificadas imediatamente,
      // permitindo que o usuário veja o funcionamento real nos primeiros instantes de teste!
      if (notifiedSalesIds.size === 0 && isFirstRun) {
        if (sales.length > 2) {
          // Deixa as últimas 2 de fora para serem notificadas na sequência de testes amigáveis
          const toSeed = sales.slice(0, sales.length - 2);
          toSeed.forEach(sale => {
            const sid = sale.id || sale.order_id || sale._id || sale.invoice_id || sale.codigo;
            if (sid) notifiedSalesIds.add(String(sid));
          });
          persistNotifiedSales();
        }
        isFirstRun = false;
        infoLog(`[Pooling Vendas] Iniciado. Semeados ${notifiedSalesIds.size} registros antigos. Últimos 2 deixados para notificação teste.`);
      }

      for (const sale of sales) {
        const id = sale.id || sale.order_id || sale._id || sale.invoice_id || sale.codigo;
        if (!id) continue;
        const stringId = String(id);

        if (!notifiedSalesIds.has(stringId)) {
          notifiedSalesIds.add(stringId);
          persistNotifiedSales(); // Salva em disco de imediato

          // Extrator inteligente com fallback para múltiplos gateways (Mercado Pago, Hotmart, WooCommerce, Shopify, etc)
          const customerEmail = sale.email || sale.customer_email || (sale.customer && (sale.customer.email || sale.customer.first_name)) || "cliente@loja.com";
          const amount = sale.amount || sale.total || sale.total_price || sale.value || sale.valor || "149.90";
          const productName = sale.productName || sale.product || sale.product_name || sale.item || (sale.line_items && sale.line_items[0] && (sale.line_items[0].name || sale.line_items[0].title)) || "Coruja Store Bot Premium Kit";

          // Formatação comemoração super estilizada estilo Discord webhook
          const celebrationMsg = 
            `==============================\n` +
            `🎉💰 *NOVA VENDA CONFIRMADA!* 💰🎉\n` +
            `==============================\n\n` +
            `👤 *E-mail:* ${customerEmail}\n` +
            `📦 *Produto:* ${productName}\n` +
            `💳 *Valor:* R$ ${parseFloat(amount).toFixed(2)}\n` +
            `⚡ *Status:* Pago & Aprovado ✅\n\n` +
            `==============================\n` +
            `🚀 _${config.shop_name || "Coruja Store"} Integration - Coruja Store Bot_ 🚀`;

          let receiverJid = config.webhook_receiver_jid || "default";

          if (receiverJid === "default") {
            try {
              const groups = await socket.groupFetchAllParticipating();
              const firstGroup = Object.keys(groups)[0];
              if (firstGroup) {
                receiverJid = firstGroup;
              } else {
                receiverJid = socket.user.id;
              }
            } catch (e) {
              receiverJid = socket.user?.id;
            }
          }

          if (receiverJid) {
            infoLog(`[Pooling Vendas] 🚀 Nova venda detectada #${stringId}! Disparando comemoração para ${receiverJid}...`);
            await socket.sendMessage(receiverJid, { text: celebrationMsg });
          }
        }
      }
      isFirstRun = false;
    } catch (err) {
      errorLog(`[Pooling Vendas] Erro no polling de vendas: ${err.message}`);
    }
  };

  await fetchRecentSales();
  salesIntervalId = setInterval(fetchRecentSales, 10000); // Polling acelerado para 10 segundos
  successLog("[Pooling Vendas] Sistema de agendamento automático acelerado de 10s iniciado.");
}

export async function connect() {
  const baileysFolder = path.resolve(
    process.cwd(),
    "takeshi-bot-main",
    "assets",
    "auth",
    "baileys"
  );

  const { state, saveCreds } = await useMultiFileAuthState(baileysFolder);

  let version = [2, 3000, 101597];
  try {
    const latest = await fetchLatestBaileysVersion().catch(() => ({ version }));
    if (latest && latest.version) {
      version = latest.version;
    }
  } catch (err) {
    infoLog("Não foi possível buscar a versão mais recente do Baileys online, usando fallback local.");
  }

  const socket = makeWASocket({
    version,
    logger,
    defaultQueryTimeoutMs: undefined,
    retryRequestDelayMs: 5000,
    auth: state,
    shouldIgnoreJid: (jid) =>
      isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid),
    connectTimeoutMs: 60_000,
    keepAliveIntervalMs: 30_000,
    maxMsgRetryCount: 5,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    emitOwnEvents: false,
    msgRetryCounterCache,
    shouldSyncHistoryMessage: () => false,
  });

  global.kazuyaSocket = socket;
  if (!socket.authState.creds.registered) {
    infoLog("Sessão WhatsApp não pareada. Aguardando escanear QR Code ou inserir número do bot...");
    global.kazuyaConnectionStatus = "connecting";
  } else {
    global.kazuyaConnectionStatus = "connecting";
  }

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      global.kazuyaQrCodeData = qr;
      global.kazuyaQrType = "qr";
      infoLog("Novo QR Code gerado pelo Baileys. Escaneie pelo celular em Aparelhos Conectados.");
    }

    if (connection === "close") {
      stopSalesPooling();

      if (global.kazuyaManualStop) {
        global.kazuyaConnectionStatus = "disconnected";
        infoLog("Conexão com o WhatsApp finalizada manualmente pelo usuário. Ignorando reconexão automática.");
        global.kazuyaManualStop = false;
        return;
      }

      // Mantém conectando para não quebrar o estado visual no frontend durante a reconexão automática
      global.kazuyaConnectionStatus = "connecting";

      const error = lastDisconnect?.error;
      const statusCode = error?.output?.statusCode;

      if (
        error?.message?.includes("Bad MAC") ||
        error?.toString()?.includes("Bad MAC")
      ) {
        errorLog("Bad MAC error na desconexão detectado");

        if (badMacHandler.handleError(error, "connection.update")) {
          if (badMacHandler.hasReachedLimit()) {
            warningLog(
              "Limite de erros Bad MAC atingido. Limpando arquivos de sessão problemáticos...",
            );
            badMacHandler.clearProblematicSessionFiles();
            badMacHandler.resetErrorCount();

            setTimeout(async () => {
              try {
                const newSocket = await connect();
                load(newSocket);
              } catch (e) {
                errorLog(`Erro ao reiniciar após Bad MAC: ${e.message}`);
              }
            }, 5000);
            return;
          }
        }
      }

      if (statusCode === DisconnectReason.loggedOut) {
        errorLog("Bot desconectado! Limpando dados da sessão desvinculada do celular...");
        try {
          fs.rmSync(baileysFolder, { recursive: true, force: true });
        } catch (err) {
          errorLog(`Erro ao limpar pasta de autenticação: ${err.message || err}`);
        }
        // Aguarda um momento e conecta novamente para reiniciar o ciclo limpo (esperando pareamento)
        setTimeout(async () => {
          try {
            const newSocket = await connect();
            load(newSocket);
          } catch (e) {
            errorLog(`Falha ao conectar pós-logout: ${e.message}`);
          }
        }, 5000);
      } else {
        switch (statusCode) {
          case DisconnectReason.badSession:
            warningLog("Sessão inválida!");

            const sessionError = new Error("Bad session detected");
            if (badMacHandler.handleError(sessionError, "badSession")) {
              if (badMacHandler.hasReachedLimit()) {
                warningLog(
                  "Limite de erros de sessão atingido. Limpando arquivos de sessão...",
                );
                badMacHandler.clearProblematicSessionFiles();
                badMacHandler.resetErrorCount();
              }
            }
            break;
          case DisconnectReason.connectionClosed:
            warningLog("Conexão fechada!");
            break;
          case DisconnectReason.connectionLost:
            warningLog("Conexão perdida!");
            break;
          case DisconnectReason.connectionReplaced:
            warningLog("Conexão substituída!");
            break;
          case DisconnectReason.multideviceMismatch:
            warningLog("Dispositivo incompatível!");
            break;
          case DisconnectReason.forbidden:
            warningLog("Conexão proibida!");
            break;
          case DisconnectReason.restartRequired:
            infoLog('Me reinicie por favor! Digite "npm start".');
            break;
          case DisconnectReason.unavailableService:
            warningLog("Serviço indisponível!");
            break;
        }

        setTimeout(async () => {
          try {
            const newSocket = await connect();
            load(newSocket);
          } catch (e) {
            errorLog(`Falha ao tentar reconectar automaticamente: ${e.message}`);
          }
        }, 5000);
      }
    } else if (connection === "open") {
      global.kazuyaConnectionStatus = "connected";
      clearScreenWithBanner();
      successLog("✅ Bot iniciado com sucesso!");
      successLog("Fui conectado com sucesso!");
      infoLog("Versão do WhatsApp Web: " + version.join("."));
      successLog(
        `✅ Estou pronto para uso! 
Verifique o prefixo, digitando a palavra "prefixo" no WhatsApp. 
O prefixo padrão definido no config.js é ${PREFIX}`,
      );
      badMacHandler.resetErrorCount();
      // startSalesPooling(socket) was disabled to comply with the removal of the API integration features
      // of sales notifications, focusing exclusively on Recurrent Offers.
    } else if (connection === "connecting") {
      global.kazuyaConnectionStatus = "connecting";
      infoLog("Conectando...");
    } else {
      infoLog("Atualizando conexão...");
    }
  });

  socket.ev.on("creds.update", saveCreds);

  return socket;
}
