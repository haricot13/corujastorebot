import { PREFIX } from "../../config.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "pedido",
  description: "Consulta o status e entrega a licença/produto de um pedido.",
  commands: ["pedido", "order", "statuspedido"],
  usage: `${PREFIX}pedido ID_DO_PEDIDO`,
  handle: async ({ args, sendReply, sendWaitReply, sendReact }) => {
    const orderId = args[0];

    if (!orderId) {
      await sendReply(`⚠️ Por favor, informe o ID do pedido. Exemplo: *${PREFIX}pedido PED123456*`);
      return;
    }

    await sendReact("🔍");
    await sendWaitReply(`Buscando dados do pedido #${orderId} no site da loja...`);

    try {
      const response = await fetch(`http://localhost:3000/api/bot/order/${encodeURIComponent(orderId)}`, {
        headers: {
          "X-Bot-Token": "{corujabot_1lv0KF2mAxgqgkHPrMbVeuW5zag4}"
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na API (${response.status})`);
      }

      const order = await response.json();

      let text = `==============================\n`;
      text += `🛒 *DETALHES DO PEDIDO #${order.id}* 🛒\n`;
      text += `==============================\n\n`;
      text += `📦 *Produto:* ${order.product || "Produto Digital"}\n`;
      text += `💰 *Valor:* R$ ${parseFloat(order.amount).toFixed(2)}\n`;
      text += `⚡ *Status:* ${order.status === "approved" ? "Aprovado ✅" : "Pendente/Processando ⏳"}\n\n`;

      if (order.status === "approved") {
        text += `🔑 *SUA ENTREGA (LICENÇA/DADOS):*\n`;
        text += `\`\`\`${order.asset_data || "Licença gerada com sucesso!"}\`\`\`\n\n`;
        text += `🎁 _Obrigado pela sua compra! Seu produto foi liberado com sucesso!_ 🪐`;
      } else {
        text += `⚠️ *Atenção:* O pedido está pendente. Efetue o pagamento e aguarde a liberação imediata.`;
      }

      await sendReply(text);
    } catch (error) {
      errorLog(`Erro ao buscar pedido: ${error.message}`);
      await sendReply(`❌ Falha ao encontrar o pedido #${orderId}. Verifique o código informado.`);
    }
  }
};
