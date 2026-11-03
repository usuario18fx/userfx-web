import { randomUUID } from 'node:crypto';
import { MESSAGE_TEMPLATES } from './message-templates.js';
import { signVoter } from './fx-rating.js';

export function installMessages(targetBot, { redis, isAdmin, resolveRecipient, sender, siteUrl, secret, botId }) {
  const key = ctx => `userfx:message:${botId}:${ctx.chat.id}:${ctx.from.id}`;
  const save = (client, ctx, value) => client.set(key(ctx), JSON.stringify(value), 'EX', 1800);
  const buttons = state => ({ inline_keyboard: [
    ...MESSAGE_TEMPLATES.map((t, i) => [{ text: `${i + 1}. ${t.title}`, callback_data: `fxmsg:pick:${state.nonce}:${i}` }]),
    [{ text: 'Cancelar', callback_data: `fxmsg:cancel:${state.nonce}` }],
  ] });
  targetBot.use(async (ctx, next) => {
    const text = ctx.message?.text || '';
    const data = ctx.callbackQuery?.data || '';
    const command = /^\/message(?:@\w+)?(?:\s+(.*))?$/i.exec(text);
    if (!command && !data.startsWith('fxmsg:')) {
      if (!isAdmin(ctx) || ctx.chat?.type !== 'private' || !text) return next();
      if (text.startsWith('/')) { const client = await redis(); if (client) await client.del(key(ctx)); return next(); }
      const client = await redis();
      const raw = client && await client.get(key(ctx));
      if (!raw || JSON.parse(raw).stage !== 'contact') return next();
    }
    if (!isAdmin(ctx) || ctx.chat?.type !== 'private') return ctx.reply('Solo el administrador puede usar /message en privado.');
    try {
      const client = await redis();
      if (!client) throw new Error('Redis unavailable');
      if (command || (!data && text)) {
        const contact = (command ? command[1] : text)?.trim().replace(/^@/, '').toLowerCase();
        const state = { nonce: randomUUID().slice(0, 8), stage: 'contact' };
        if (!contact) {
          await save(client, ctx, state);
          return ctx.reply('Envía el @usuario del contacto. /message @usuario también funciona. Usa /message cancel para salir.');
        }
        if (contact === 'cancel') { await client.del(key(ctx)); return ctx.reply('Cancelado.'); }
        if (!/^[a-z0-9_]{3,32}$/.test(contact)) return ctx.reply('Introduce un @usuario válido.');
        const recipient = await resolveRecipient(contact, client);
        if (!recipient) return ctx.reply('No encuentro un chat privado verificado. El contacto debe iniciar primero el bot.');
        Object.assign(state, { stage: 'templates', contact, recipient });
        await save(client, ctx, state);
        return ctx.reply(`Mensaje para @${contact}. Selecciona una plantilla:`, { reply_markup: buttons(state) });
      }
      await ctx.answerCbQuery();
      const [, action, nonce, index] = data.split(':');
      const raw = await client.get(key(ctx));
      const state = raw && JSON.parse(raw);
      if (!state || state.nonce !== nonce) return ctx.reply('Este menú venció. Usa /message otra vez.');
      if (action === 'cancel') { await client.del(key(ctx)); return ctx.reply('Cancelado.'); }
      if (action === 'pick' && /^\d$/.test(index) && MESSAGE_TEMPLATES[Number(index)]) {
        const rating = new URL(siteUrl);
        rating.searchParams.set('fx_rating', signVoter(state.recipient, secret));
        rating.hash = 'fx-community-rating';
        Object.assign(state, { stage: 'preview', template: Number(index), rating: rating.href });
        await save(client, ctx, state);
        return ctx.reply(`Vista previa para @${state.contact}:\n\n${MESSAGE_TEMPLATES[state.template].text}\n\n${siteUrl}`, {
          reply_markup: { inline_keyboard: [[{ text: 'Enviar', callback_data: `fxmsg:send:${nonce}` }], [{ text: 'Cancelar', callback_data: `fxmsg:cancel:${nonce}` }]] },
        });
      }
      if (action === 'send' && state.stage === 'preview') {
        if (await resolveRecipient(state.contact, client) !== state.recipient) return ctx.reply('El contacto cambió. Inicia /message de nuevo.');
        if (await client.set(key(ctx) + ':sending:' + nonce, '1', 'EX', 1800, 'NX') !== 'OK') return ctx.reply('Este envío ya fue procesado.');
        await sender.sendMessage(state.recipient, MESSAGE_TEMPLATES[state.template].text, { reply_markup: { inline_keyboard: [
          [{ text: 'Explore USER FX ↗', url: siteUrl }], [{ text: 'Rate with crowns 👑', url: state.rating }],
        ] } });
        await client.del(key(ctx));
        return ctx.reply(`Enviado a @${state.contact}.`);
      }
    } catch { return ctx.reply('No se pudo completar. Revisa el contacto y vuelve a iniciar /message; no se reenvió automáticamente.'); }
  });
}
