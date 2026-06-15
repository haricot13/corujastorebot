import { PREFIX } from "../../config.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "recarga",
  description: "Realiza a recarga do saldo na carteira do site de um cliente.",
  commands: ["recarga", "recharge", "addsaldo"],
  usage: `${PREFIX}recarga email@cliente.com VALOR`,
  handle: async ({ args, sendReply, sendWaitReply, sendReact }) => {
    const email = args[0];
    const amountStr = args[1];

    if (!email || !amountStr) {
      await sendReply(`⚠️ Formato inválido! Exemplo de uso: *${PREFIX}recarga email@cliente.com 50.00*`);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      await sendReply("⚠️ O primeiro argumento precisa ser um e-mail de cliente válido!");
      return;
    }

    const amount = parseFloat(amountStr.replace(",", "."));
    if (isNaN(amount) || amount <= 0) {
      await sendReply("⚠️ O valor fornecido precisa ser um número decimal válido maior que zero.");
      return;
    }

    await sendReact("⚡");
    await sendWaitReply(`Processando liberação de crédito de R$ ${amount.toFixed(2)} para o e-mail: ${email}...`);

    try {
      const response = await fetch("http://localhost:3000/api/bot/recharge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Token": "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}"
        },
        body: JSON.stringify({
          email: email,
          amount: amount,
          reason: "Aprovado via WhatsApp"
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API (${response.status})`);
      }

      const result = await response.json();

      let text = `==============================\n`;
      text += `💰 *RECARGA EFETUADA COM SUCESSO!* 💰\n`;
      text += `==============================\n\n`;
      text += `📧 *Cliente:* ${email}\n`;
      text += `💵 *Crédito:* + R$ ${amount.toFixed(2)}\n`;
      text += `🔋 *Novo Saldo:* R$ ${parseFloat(result.newBalance).toFixed(2)}\n`;
      text += `⚡ *Status:* Confirmado (Através do WhatsApp Bot) ✅\n\n`;
      text += `🪐 *Aviso:* O crédito já foi creditado na conta do cliente e está disponível para uso na loja virtual!`;

      await sendReply(text);
    } catch (error) {
      errorLog(`Erro ao realizar recarga: ${error.message}`);
      await sendReply(`❌ Falha ao aplicar a recarga de ${email}. Verifique se o servidor está ativo.`);
    }
  }
};
