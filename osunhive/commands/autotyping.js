/**
 * Osunhive Bot - A WhatsApp Bot
 * Autotyping Command - Shows fake typing status
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const isOwnerOrSudo = require('../lib/isOwner');

// Path to store the configuration
const configPath = path.join(__dirname, '..', 'data', 'autotyping.json');

// Initialize configuration file if it doesn't exist
function initConfig() {
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath));
}

// ✅ EXTENDED CONFIG
function initExtendedConfig() {
    const config = initConfig();

    if (typeof config.autoreply !== 'boolean') {
        config.autoreply = false;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    return config;
}

// Toggle autotyping feature
async function autotypingCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363419178084647@newsletter',
                        newsletterName: 'Osunhive Bot',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        const args = message.message?.conversation?.trim().split(' ').slice(1) || 
                     message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) || 
                     [];
        
        const config = initConfig();
        
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                config.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                config.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autotyping on/off'
                });
                return;
            }
        } else {
            config.enabled = !config.enabled;
        }
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        
        await sock.sendMessage(chatId, {
            text: `✅ Auto-typing has been ${config.enabled ? 'enabled' : 'disabled'}!`
        });
        
    } catch (error) {
        console.error('Error in autotyping command:', error);
    }
}

// Function to check if autotyping is enabled
function isAutotypingEnabled() {
    try {
        return initConfig().enabled;
    } catch (error) {
        console.error('Error checking autotyping status:', error);
        return false;
    }
}

// Function to handle autotyping for regular messages
async function handleAutotypingForMessage(sock, chatId, userMessage) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(r => setTimeout(r, 500));

            await sock.sendPresenceUpdate('composing', chatId);

            const typingDelay = Math.max(3000, Math.min(8000, userMessage.length * 150));
            await new Promise(r => setTimeout(r, typingDelay));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 1500));

            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('❌ Error sending typing indicator:', error);
            return false;
        }
    }
    return false;
}

// Function to handle autotyping for commands
async function handleAutotypingForCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('available', chatId);
            await new Promise(r => setTimeout(r, 500));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 3000));

            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 1500));

            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('❌ Error sending command typing indicator:', error);
            return false;
        }
    }
    return false;
}

// Function to show typing status AFTER command execution
async function showTypingAfterCommand(sock, chatId) {
    if (isAutotypingEnabled()) {
        try {
            await sock.presenceSubscribe(chatId);
            await sock.sendPresenceUpdate('composing', chatId);
            await new Promise(r => setTimeout(r, 1000));
            await sock.sendPresenceUpdate('paused', chatId);
            return true;
        } catch (error) {
            console.error('❌ Error sending post-command typing indicator:', error);
            return false;
        }
    }
    return false;
}

/* =====================================================
   ✅ MARKDOWN TO WHATSAPP FORMATTER (NEW)
===================================================== */

/**
 * Convert markdown formatting to WhatsApp formatting
 * @param {string} text - Text with markdown formatting
 * @returns {string} - Text with WhatsApp formatting
 */
function markdownToWhatsApp(text) {
    if (!text || typeof text !== 'string') return text;

    let formatted = text;

    // Convert headers (# Header) to bold with emoji
    formatted = formatted.replace(/^### (.*?)$/gm, '📌 *$1*');
    formatted = formatted.replace(/^## (.*?)$/gm, '📍 *$1*');
    formatted = formatted.replace(/^# (.*?)$/gm, '🔷 *$1*');

    // Convert bold: **text** or __text__ to *text*
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '*$1*');
    formatted = formatted.replace(/__(.*?)__/g, '*$1*');

    // Convert italic: *text* or _text_ to _text_
    formatted = formatted.replace(/(?<!\*)\*(?!\*)([^\*]+?)(?<!\*)\*(?!\*)/g, '_$1_');
    formatted = formatted.replace(/(?<!_)_(?!_)([^_]+?)(?<!_)_(?!_)/g, '_$1_');

    // Convert strikethrough: ~~text~~ to ~text~
    formatted = formatted.replace(/~~(.*?)~~/g, '~$1~');

    // Convert code blocks: ```code``` to monospace
    formatted = formatted.replace(/```([\s\S]*?)```/g, '```$1```');

    // Convert inline code: `code` to ```code```
    formatted = formatted.replace(/`([^`]+)`/g, '```$1```');

    // Convert bullet lists: - item or * item to • item
    formatted = formatted.replace(/^[\-\*] (.+)$/gm, '• $1');

    // Convert numbered lists: 1. item to 1️⃣ item
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, (match, num, text) => {
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        const emoji = emojis[parseInt(num) - 1] || `${num}.`;
        return `${emoji} ${text}`;
    });

    // Convert links: [text](url) to text (url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '$1 ($2)');

    // Convert blockquotes: > text to ❝ text
    formatted = formatted.replace(/^> (.+)$/gm, '❝ $1');

    // Clean up excessive newlines (more than 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Remove horizontal rules
    formatted = formatted.replace(/^[\-\*_]{3,}$/gm, '');

    return formatted.trim();
}

/* =====================================================
   ✅ API AUTO-REPLY WITH CEO PERSONA (IMPROVED)
===================================================== */

/**
 * Generate CEO-style response using AI
 * @param {string} userMessage - User's message
 * @returns {string} - CEO-style formatted response
 */
async function generateApiReply(userMessage) {
    try {
        // CEO of Osunhive persona prompt
        const ceoPrompt = `You are the CEO of Osunhive, a leading technology and innovation company. 
Your name is  Dev Olajide sherif oyinlola, the CEO of Osunhive. You are professional, helpful, and customer-focused.

Guidelines:
- Be professional yet friendly
- Show empathy and understanding
- Provide clear, actionable solutions
- Represent Osunhive's values of innovation and excellence
- Be concise but thorough
- Use a warm, approachable tone
- Sign off professionally when appropriate

Customer message: ${userMessage}

Respond as the CEO of Osunhive would:`;

        const url = `https://mkllm.hideme.eu.org/${encodeURIComponent(ceoPrompt)}`;

        const res = await axios.get(url, { timeout: 20000 });
        let reply = res.data?.toString().trim();

        if (!reply || reply.length < 10) {
            return '👋 Hello! I\'m the CEO of Osunhive. How can I assist you today? Please feel free to share your inquiry.\n\n🌐 https://www.osunhive.name.ng';
        }

        // Convert markdown to WhatsApp format
        reply = markdownToWhatsApp(reply);

        // Add CEO signature and website link to all responses
        if (reply.length > 50) {
            if (!reply.includes('CEO') && !reply.includes('— Osunhive')) {
                reply += '\n\n_— CEO, Osunhive_';
            }
            // Always add website link if not present
            if (!reply.includes('osunhive.name.ng')) {
                reply += '\n🌐 https://www.osunhive.name.ng';
            }
        }

        return reply;

    } catch (error) {
        console.error('❌ API reply error:', error.message);
        
        // Fallback professional response
        return '👋 Thank you for reaching out to Osunhive!\n\n' +
               'I apologize, but I\'m experiencing a brief technical issue. ' +
               'Your message is important to us.\n\n' +
               'Please try again in a moment, or feel free to contact our support team directly.\n\n' +
               '_— CEO, Osunhive_\n' +
               '🌐 https://www.osunhive.name.ng';
    }
}

// Auto-reply command
async function autoreplyCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);

        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { text: '❌ Owner only command!' });
            return;
        }

        const args =
            message.message?.conversation?.trim().split(' ').slice(1) ||
            message.message?.extendedTextMessage?.text?.trim().split(' ').slice(1) ||
            [];

        const config = initExtendedConfig();

        if (args.length === 0) {
            config.autoreply = !config.autoreply;
        } else {
            const action = args[0].toLowerCase();
            if (action === 'on') config.autoreply = true;
            else if (action === 'off') config.autoreply = false;
            else {
                await sock.sendMessage(chatId, { text: '❌ Use: .autoreply on/off' });
                return;
            }
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await sock.sendMessage(chatId, {
            text: `✅ Auto-reply ${config.autoreply ? 'enabled' : 'disabled'}\n\n` +
                  `${config.autoreply ? '🤖 CEO persona active - AI will respond as CEO of Osunhive' : ''}`
        });

    } catch (error) {
        console.error('Auto-reply command error:', error);
    }
}

/**
 * Handle auto-reply with proper formatting
 * @param {object} sock - WhatsApp socket connection
 * @param {string} chatId - Chat ID
 * @param {string} userMessage - User's message
 * @returns {boolean} - Success status
 */
async function handleAutoReply(sock, chatId, userMessage) {
    const config = initExtendedConfig();
    if (!config.autoreply) return false;

    try {
        // Show typing indicator if enabled
        if (config.enabled) {
            await handleAutotypingForMessage(sock, chatId, userMessage);
        }

        // Generate CEO-style response
        const reply = await generateApiReply(userMessage);

        // Send formatted response
        await sock.sendMessage(chatId, { 
            text: reply,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: false,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363419178084647@newsletter',
                    newsletterName: 'Osunhive Bot',
                    serverMessageId: -1
                }
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Auto-reply failed:', error);
        
        // Send fallback message
        try {
            await sock.sendMessage(chatId, { 
                text: '⚠️ I apologize for the inconvenience. Our system is momentarily unavailable. Please try again shortly.\n\n_— Osunhive Support Team_\n🌐 https://www.osunhive.name.ng'
            });
        } catch (sendError) {
            console.error('❌ Failed to send fallback message:', sendError);
        }
        
        return false;
    }
}

module.exports = {
    autotypingCommand,
    autoreplyCommand,
    isAutotypingEnabled,
    handleAutotypingForMessage,
    handleAutotypingForCommand,
    showTypingAfterCommand,
    handleAutoReply,
    markdownToWhatsApp  // Export formatter for use in other modules
};
