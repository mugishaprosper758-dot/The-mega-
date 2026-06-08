// ─── IANENIGMA MD BOT — Anti-Ban Utilities ──────────────────────────────────
// Central module for all ban-safety features.

// Sleep window: bot ignores non-owner commands between 1 AM and 6 AM.
// This mimics a human who doesn't operate a phone at 3am.
const SLEEP_START = 1   // 1:00 AM
const SLEEP_END   = 6   // 6:00 AM

function isSleepTime() {
    const hour = new Date().getHours()
    return hour >= SLEEP_START && hour < SLEEP_END
}

// Simulate human typing before replying.
// Sends a "composing" presence, waits a realistic delay, then stops.
async function simulateTyping(sock, chatId, text = '') {
    try {
        const charCount = typeof text === 'string' ? text.length : 80
        // 35ms per char, min 700ms, max 3200ms
        const typingMs = Math.min(Math.max(charCount * 35, 700), 3200)
        await sock.sendPresenceUpdate('composing', chatId)
        await new Promise(r => setTimeout(r, typingMs))
        await sock.sendPresenceUpdate('paused', chatId)
    } catch (_) { /* non-critical */ }
}

// Returns true if the message should be silently ignored for ban-safety.
function shouldIgnoreMessage(message) {
    const chatId = message.key?.remoteJid

    // Never process broadcast list messages
    if (chatId === 'status@broadcast') return true
    if (chatId?.endsWith('@broadcast')) return true

    // Ignore heavily forwarded messages (forwarding score >5 flags as spam)
    const msg = message.message
    const anyMsg = (
        msg?.extendedTextMessage ||
        msg?.imageMessage ||
        msg?.videoMessage ||
        msg?.documentMessage ||
        msg?.audioMessage
    )
    const fwdScore = anyMsg?.contextInfo?.forwardingScore ?? 0
    if (fwdScore > 5) return true

    return false
}

// Branded footer appended to all text/caption replies.
const FOOTER = '\n\n> _🦇 ɪᴀɴᴇɴɪɢᴍᴀ ᴍᴅ ʙᴏᴛ_'

// Patch sock.sendMessage once so every text reply carries the footer.
// Call this right after the socket connects.
function patchSockWithFooter(sock) {
    if (sock._ianFooterPatched) return
    sock._ianFooterPatched = true
    const _orig = sock.sendMessage.bind(sock)
    sock.sendMessage = async (jid, content, opts) => {
        if (content && typeof content === 'object') {
            if (typeof content.text === 'string' && !content.text.includes('ɪᴀɴᴇɴɪɢᴍᴀ')) {
                content = { ...content, text: content.text + FOOTER }
            } else if (typeof content.caption === 'string' && !content.caption.includes('ɪᴀɴᴇɴɪɢᴍᴀ')) {
                content = { ...content, caption: content.caption + FOOTER }
            }
        }
        return _orig(jid, content, opts)
    }
}

// Send a WhatsApp emoji reaction on a message before replying.
async function reactToMessage(sock, message, emoji = '⚡') {
    try {
        await sock.sendMessage(message.key.remoteJid, {
            react: { text: emoji, key: message.key }
        })
    } catch (_) { /* non-critical */ }
}

module.exports = { isSleepTime, simulateTyping, shouldIgnoreMessage, patchSockWithFooter, reactToMessage, FOOTER }
