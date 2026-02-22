require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    Partials, 
    PermissionFlagsBits, 
    ChannelType, 
    PermissionsBitField, 
    ActivityType,
    AttachmentBuilder
} = require('discord.js');

// =============================================================================
//  MÜZİK KÜTÜPHANELERİ (YENİ EKLENDİ)
//  Terminale: npm install @discordjs/voice @discordjs/opus libsodium-wrappers play-dl
// =============================================================================
const { 
    joinVoiceChannel, 
    VoiceConnectionStatus, 
    entersState,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    getVoiceConnection
} = require('@discordjs/voice');
const playdl = require('play-dl'); // YouTube ve diğer platformlardan müzik çalmak için

const express = require('express');
const axios = require('axios');

// =============================================================================
//                             AYARLAR VE KONFİGÜRASYON
// =============================================================================
const CONFIG = {
    // ------------------- VERİTABANI BAĞLANTISI -------------------
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    
    // ------------------- YETKİLENDİRME -------------------
    OWNER_ID: "1380526273431994449", 
    MASTER_VIEW_ID: "1380526273431994449",
    SUPPORT_ROLE_ID: "1380526273431994449", 

    // ------------------- KANALLAR VE ROLLER -------------------
    LOG_CHANNEL_ID: "BURAYA_LOG_KANAL_ID_YAZ",       
    CUSTOMER_ROLE_ID: "BURAYA_MUSTERI_ROL_ID_YAZ",    
    
    // ------------------- 7/24 SES AYARLARI -------------------
    VOICE_GUILD_ID: "1446824586808262709",    // Sunucu ID
    VOICE_CHANNEL_ID: "1465453822204969154",  // Ses Kanalı ID

    // ------------------- MÜZİK AYARLARI (YENİ) -------------------
    DEFAULT_VOLUME: 50,      // Varsayılan ses seviyesı (%50)
    MAX_QUEUE_SIZE: 50,      // Maksimum sıra uzunluğu
    MAX_DURATION: 1200,      // Maksimum şarkı süresi (saniye - 20 dakika)
    
    // ------------------- LİSANS SİSTEMİ LİMİTLERİ -------------------
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999,
    VIP_RESET_LIMIT: 5,

    // ------------------- TASARIM (RENK PALETİ) -------------------
    EMBED_COLOR: '#2B2D31',
    SUCCESS_COLOR: '#57F287',
    ERROR_COLOR: '#ED4245',
    INFO_COLOR: '#5865F2',
    GOLD_COLOR: '#F1C40F'
};

// ------------------- GLOBAL DEĞİŞKENLER -------------------
let isMaintenanceEnabled = false;
let loaderStatus = "UNDETECTED 🟢";

// =============================================================================
//                      MÜZİK SİSTEMİ GLOBAL DEĞİŞKENLER (YENİ)
// =============================================================================
const musicQueues = new Map(); // Her sunucu için müzik kuyruğu
const musicPlayers = new Map(); // Her sunucu için aktif oynatıcı
const musicConnections = new Map(); // Her sunucu için ses bağlantısı
const nowPlayingMessages = new Map(); // Şu an çalan mesajı

// =============================================================================
//                             1. WEB SERVER
// =============================================================================
const app = express();

app.get('/', (req, res) => {
    res.send({ 
        status: 'Online', 
        system: 'SAHO CHEATS SYSTEM vFinal + Music',
        time: new Date().toISOString()
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🌍 [SERVER] Web sunucusu ${port} portunda başlatıldı.`);
});

// =============================================================================
//                             2. BOT İSTEMCİSİ
// =============================================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates // Ses için gerekli!
    ], 
    partials: [Partials.Channel, Partials.Message, Partials.User] 
});

// =============================================================================
//                             3. KOMUT LİSTESİ (MÜZİK EKLENDİ)
// =============================================================================
const commands = [
    // ------------------- VİTRİN VE ÜRÜN YÖNETİMİ -------------------
    new SlashCommandBuilder()
        .setName('format')
        .setDescription('📸 (Admin) 4 Fotoğraflı, profesyonel ürün vitrini oluşturur.')
        .addStringOption(o => o.setName('urun').setDescription('Ürün Adı').setRequired(true))
        .addStringOption(o => o.setName('haftalik').setDescription('Haftalık Fiyat').setRequired(true))
        .addStringOption(o => o.setName('aylik').setDescription('Aylık Fiyat').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel1').setDescription('Ana Resim (Zorunlu)').setRequired(true))
        .addAttachmentOption(o => o.setName('gorsel2').setDescription('Ek Resim 1').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel3').setDescription('Ek Resim 2').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel4').setDescription('Ek Resim 3').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ------------------- TICKET VE DESTEK -------------------
    new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('🎫 (Admin) Menülü (Select Menu) Ticket Panelini Kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sss')
        .setDescription('❓ Sıkça Sorulan Sorular'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Bot kullanım rehberi ve tüm komutlar.'),

    // ------------------- MÜZİK KOMUTLARI (YENİ EKLENENLER) -------------------
    new SlashCommandBuilder()
        .setName('oynat')
        .setDescription('🎵 Belirtilen şarkıyı çalar veya kuyruğa ekler.')
        .addStringOption(o => 
            o.setName('sarki')
                .setDescription('Şarkı adı veya YouTube linki')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('durdur')
        .setDescription('⏹️ Şarkıyı durdurur ve sesten çıkar.'),

    new SlashCommandBuilder()
        .setName('sarkiatla')
        .setDescription('⏭️ Sıradaki şarkıya geçer.'),

    new SlashCommandBuilder()
        .setName('duraklat')
        .setDescription('⏸️ Şarkıyı duraklatır.'),

    new SlashCommandBuilder()
        .setName('devam')
        .setDescription('▶️ Duraklatılmış şarkıyı devam ettirir.'),

    new SlashCommandBuilder()
        .setName('ses')
        .setDescription('🔊 Ses seviyesini ayarlar (1-100).')
        .addIntegerOption(o => 
            o.setName('seviye')
                .setDescription('Ses seviyesi (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)),

    new SlashCommandBuilder()
        .setName('kuyruk')
        .setDescription('📜 Şu anki müzik kuyruğunu gösterir.'),

    new SlashCommandBuilder()
        .setName('tekrar')
        .setDescription('🔄 Şarkıyı tekrarlama modunu açar/kapatır.'),

    new SlashCommandBuilder()
        .setName('karistir')
        .setDescription('🔀 Kuyruktaki şarkıları karıştırır.'),

    new SlashCommandBuilder()
        .setName('temizlekuyruk')
        .setDescription('🧹 Kuyruktaki tüm şarkıları temizler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('sarkikaldir')
        .setDescription('❌ Kuyruktan belirtilen sıradaki şarkıyı kaldırır.')
        .addIntegerOption(o => 
            o.setName('sira')
                .setDescription('Kaldırılacak şarkının sıra numarası')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('calan')
        .setDescription('🎶 Şu anda çalan şarkıyı gösterir.'),

    // ------------------- GÜVENLİK VE MODERASYON -------------------
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('☢️ (Admin) Kanalı siler ve aynı özelliklerle yeniden oluşturur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 (Admin) Kanalı kilitler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('🔓 (Admin) Kanal kilidini açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    new SlashCommandBuilder()
        .setName('dm')
        .setDescription('📨 (Admin) Bot üzerinden kullanıcıya özel mesaj atar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kime?').setRequired(true))
        .addStringOption(o => o.setName('mesaj').setDescription('Ne yazılacak?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 (Admin) Kullanıcıyı sunucudan atar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 (Admin) Kullanıcıyı yasaklar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addStringOption(o => o.setName('sebep').setDescription('Sebep').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 (Admin) Kullanıcının yasağını kaldırır.')
        .addStringOption(o => o.setName('id').setDescription('Kullanıcı ID').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('temizle')
        .setDescription('🧹 (Admin) Sohbeti temizler.')
        .addIntegerOption(o => o.setName('sayi').setDescription('Silinecek miktar (1-100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('bakim-modu')
        .setDescription('🔒 (Admin) Bakım modunu yönetir.')
        .addBooleanOption(o => o.setName('durum').setDescription('Açık mı?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('karaliste-ekle')
        .setDescription('⛔ (Admin) Kullanıcıyı bot karalistesine alır.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('karaliste-cikar')
        .setDescription('✅ (Admin) Kullanıcıyı karalisteden çıkarır.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ------------------- YÖNETİM VE DURUM -------------------
    new SlashCommandBuilder()
        .setName('tum-lisanslar')
        .setDescription('📜 (Admin) Aktif tüm lisansları listeler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('loader-durum')
        .setDescription('🛡️ (Admin) Loader güvenlik durumunu değiştirir.')
        .addStringOption(o => o.setName('durum').setDescription('Durum ne?').setRequired(true)
            .addChoices(
                {name:'🟢 UNDETECTED', value:'UNDETECTED 🟢'}, 
                {name:'🟡 TESTING', value:'TESTING 🟡'}, 
                {name:'🔴 DETECTED', value:'DETECTED 🔴'}, 
                {name:'🛠️ UPDATING', value:'UPDATING 🛠️'}
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('durum-guncelle')
        .setDescription('📊 (Admin) Ürünlerin durum tablosunu yayınlar.')
        .addStringOption(o => o.setName('urun').setDescription('Hile Seç').setRequired(true)
            .addChoices(
                { name: 'PC UID Bypass', value: 'PC UID Bypass' }, 
                { name: 'PC External', value: 'PC External' }, 
                { name: 'PC Mod Menü', value: 'PC Mod Menü' }, 
                { name: 'PC Fake Lag', value: 'PC Fake Lag' }, 
                { name: 'Android Fake Lag', value: 'Android Fake Lag' }
            ))
        .addStringOption(o => o.setName('durum').setDescription('Durum').setRequired(true)
            .addChoices(
                {name:'🟢 SAFE', value:'safe'}, 
                {name:'🔴 DETECTED', value:'detected'}, 
                {name:'🟡 UPDATING', value:'updating'}
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('duyuru')
        .setDescription('📢 (Admin) Özel embed ile duyuru yapar.')
        .addStringOption(o => o.setName('mesaj').setDescription('Mesaj').setRequired(true))
        .addChannelOption(o => o.setName('kanal').setDescription('Kanal').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sunucu-bilgi')
        .setDescription('📊 Sunucu istatistiklerini gösterir.'),

    // ------------------- ÇARKIFELEK -------------------
    new SlashCommandBuilder()
        .setName('cevir')
        .setDescription('🎡 Şans Çarkı! (Ödül kazanma şansı).'),
    
    new SlashCommandBuilder()
        .setName('cark-oranlar')
        .setDescription('📊 Çarkıfelekteki ödüllerin oranlarını gösterir.'),
    
    new SlashCommandBuilder()
        .setName('cark-hak-ekle')
        .setDescription('🎡 (Admin) Kullanıcıya çark hakkı verir.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true))
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('referans')
        .setDescription('⭐ Hizmeti puanla ve yorum bırak.')
        .addIntegerOption(o => o.setName('puan').setDescription('Puan (1-5)').setRequired(true).setMinValue(1).setMaxValue(5))
        .addStringOption(o => o.setName('yorum').setDescription('Yorum').setRequired(true)),

    // ------------------- LİSANS İŞLEMLERİ -------------------
    new SlashCommandBuilder()
        .setName('lisansim')
        .setDescription('👤 Lisans durumunu ve panelini gör.'),

    new SlashCommandBuilder()
        .setName('vip-ekle')
        .setDescription('💎 (Admin) VIP lisans tanımlar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre (Gün)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kullanici-ekle')
        .setDescription('🛠️ (Admin) Normal lisans tanımlar.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre (Gün)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('olustur')
        .setDescription('🛠️ (Admin) Boş (sahipsiz) key oluşturur.')
        .addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true))
        .addStringOption(o => o.setName('isim').setDescription('İsim (Opsiyonel)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('🗑️ (Admin) Key siler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('hwid-hak-ekle')
        .setDescription('➕ (Admin) HWID hakkı ekler.')
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('durdurma-hak-ekle')
        .setDescription('➕ (Admin) Durdurma hakkı ekler.')
        .addIntegerOption(o => o.setName('adet').setDescription('Adet').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

].map(command => command.toJSON());

// =============================================================================
//                             4. YARDIMCI FONKSİYONLAR
// =============================================================================

// --- FIREBASE İSTEK YÖNETİCİSİ ---
async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const payload = data ? JSON.stringify(data) : null;
        const response = await axios({ 
            method, 
            url, 
            data: payload, 
            headers: { 'Content-Type': 'application/json' } 
        });
        return response.data;
    } catch (error) { 
        console.error("Firebase Hatası:", error.response ? error.response.data : error.message);
        return null; 
    }
}

// --- KULLANICI LİSANS BULUCU ---
async function findUserKey(discordId) {
    const data = await firebaseRequest('get', '');
    if (!data) return null;
    
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_")) continue;
        if (typeof value === 'string') {
            const parts = value.split(',');
            if (parts.length > 4 && parts[4] === discordId) return { key, parts };
        }
    }
    return null;
}

// --- YETKİ KONTROLÜ ---
async function checkPermission(userId) {
    if (userId === CONFIG.OWNER_ID) return true;
    const admins = await firebaseRequest('get', '_ADMINS_');
    return admins && admins[userId];
}

// --- TICKET SAYACI ---
async function getNextTicketNumber() {
    let count = await firebaseRequest('get', '_TICKET_COUNT');
    if (!count) count = 0;
    count++;
    await firebaseRequest('put', '_TICKET_COUNT', count);
    return count;
}

// --- LOG SİSTEMİ ---
async function sendLog(guild, content) {
    if (!guild || !CONFIG.LOG_CHANNEL_ID || CONFIG.LOG_CHANNEL_ID === "BURAYA_LOG_KANAL_ID_YAZ") return;
    const channel = guild.channels.cache.get(CONFIG.LOG_CHANNEL_ID);
    if (channel) channel.send({ content: content }).catch(() => {});
}

// --- LİSANS PANELİ OLUŞTURUCU ---
function createPanelPayload(key, parts) {
    while (parts.length < 8) parts.push("0");
    
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { 
        PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, 
        RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT 
    };
    
    let [durum, pause, reset] = [parts[2], parseInt(parts[5] || 0), parseInt(parts[6] || 0)];
    
    const kalanPause = Math.max(0, LIMITS.PAUSE - pause);
    const kalanReset = Math.max(0, LIMITS.RESET - reset);

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS KONTROL: ${isVIP ? '💎 VIP' : '🛠️ STANDART'}`)
        .setDescription(`**Key:** \`${key}\`\n\nLisans durumunuz ve kontroller aşağıdadır.`)
        .setColor(isVIP ? 'Gold' : CONFIG.EMBED_COLOR)
        .addFields(
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ **AKTİF**' : '⏸️ **DURAKLATILDI**', inline: true },
            { name: '🗓️ Bitiş', value: 'Otomatik Hesaplanıyor', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setFooter({ text: 'SAHO CHEATS Security Systems' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle')
            .setLabel(durum === 'aktif' ? 'DURDUR (Pause)' : 'BAŞLAT (Resume)')
            .setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success)
            .setEmoji(durum === 'aktif' ? '🛑' : '▶️')
            .setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0),
        
        new ButtonBuilder()
            .setCustomId('reset')
            .setLabel('HWID SIFIRLA')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
            .setDisabled(kalanReset <= 0)
    );

    return { embeds: [embed], components: [row] };
}

// =============================================================================
//                     MÜZİK SİSTEMİ YARDIMCI FONKSİYONLARI (YENİ)
// =============================================================================

// --- Ses kanalına bağlanma ---
async function connectToVoiceChannel(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription('❌ **Bir ses kanalında olmalısın!**')
                .setColor(CONFIG.ERROR_COLOR)],
            ephemeral: true 
        });
        return null;
    }

    const guildId = interaction.guild.id;
    let connection = getVoiceConnection(guildId);

    if (!connection) {
        try {
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
                selfDeaf: true // Bot sağır modda
            });

            musicConnections.set(guildId, connection);
            
            // Bağlantı durumunu izle
            connection.on(VoiceConnectionStatus.Disconnected, async () => {
                try {
                    await Promise.race([
                        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                    ]);
                } catch (error) {
                    connection.destroy();
                    musicConnections.delete(guildId);
                    musicPlayers.delete(guildId);
                    musicQueues.delete(guildId);
                }
            });

        } catch (error) {
            console.error('Ses bağlantı hatası:', error);
            await interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Ses kanalına bağlanılamadı!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
            return null;
        }
    }

    return connection;
}

// --- Oynatıcı oluşturma ---
function createPlayer(guildId) {
    const player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });

    musicPlayers.set(guildId, player);

    // Şarkı bittiğinde
    player.on(AudioPlayerStatus.Idle, () => {
        const queue = musicQueues.get(guildId);
        if (queue && queue.length > 0) {
            // Tekrar modu kontrol et
            if (queue[0]?.loop) {
                // Aynı şarkıyı tekrar çal
                playNext(guildId);
            } else {
                // Sıradaki şarkıya geç
                queue.shift();
                playNext(guildId);
            }
        } else {
            // Kuyruk boş, bağlantıyı temizle
            const connection = musicConnections.get(guildId);
            if (connection) {
                connection.destroy();
                musicConnections.delete(guildId);
            }
            musicPlayers.delete(guildId);
            musicQueues.delete(guildId);
        }
    });

    player.on('error', error => {
        console.error(`Oynatıcı hatası (${guildId}):`, error);
        const queue = musicQueues.get(guildId);
        if (queue && queue.length > 0) {
            queue.shift(); // Hatalı şarkıyı atla
            playNext(guildId);
        }
    });

    return player;
}

// --- Sıradaki şarkıyı çal ---
async function playNext(guildId) {
    const queue = musicQueues.get(guildId);
    if (!queue || queue.length === 0) {
        const connection = musicConnections.get(guildId);
        if (connection) {
            connection.destroy();
            musicConnections.delete(guildId);
        }
        musicPlayers.delete(guildId);
        return;
    }

    const player = musicPlayers.get(guildId) || createPlayer(guildId);
    const connection = musicConnections.get(guildId);

    if (!connection) return;

    try {
        const song = queue[0];
        
        // YouTube'dan stream al
        const stream = await playdl.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type,
            inlineVolume: true
        });
        
        resource.volume?.setVolumeLogarithmic(song.volume / 100);
        
        player.play(resource);
        connection.subscribe(player);

        // Şu an çalan mesajını güncelle
        await updateNowPlayingMessage(guildId, song);

    } catch (error) {
        console.error('Şarkı çalma hatası:', error);
        queue.shift(); // Hatalı şarkıyı atla
        playNext(guildId);
    }
}

// --- Şu an çalan mesajını güncelle ---
async function updateNowPlayingMessage(guildId, song) {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    const nowPlayingInfo = nowPlayingMessages.get(guildId);
    if (!nowPlayingInfo) return;

    const { channelId, messageId } = nowPlayingInfo;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    try {
        const message = await channel.messages.fetch(messageId);
        if (message) {
            const embed = new EmbedBuilder()
                .setTitle('🎵 Şu Anda Çalıyor')
                .setDescription(`**[${song.title}](${song.url})**`)
                .addFields(
                    { name: '⏱️ Süre', value: song.duration, inline: true },
                    { name: '👤 İsteyen', value: `<@${song.requesterId}>`, inline: true },
                    { name: '🔊 Ses', value: `${song.volume}%`, inline: true }
                )
                .setThumbnail(song.thumbnail)
                .setColor(CONFIG.SUCCESS_COLOR)
                .setFooter({ text: 'SAHO CHEATS Music' });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setLabel('Duraklat')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏸️'),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setLabel('Atla')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⏭️'),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setLabel('Durdur')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('⏹️'),
                    new ButtonBuilder()
                        .setCustomId('music_volume_down')
                        .setLabel('Ses Azalt')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔉'),
                    new ButtonBuilder()
                        .setCustomId('music_volume_up')
                        .setLabel('Ses Arttır')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔊')
                );

            await message.edit({ embeds: [embed], components: [row] });
        }
    } catch (error) {
        console.error('Now playing mesajı güncellenirken hata:', error);
    }
}

// --- Şarkı bilgilerini al ---
async function getSongInfo(query) {
    try {
        let songInfo;
        
        // YouTube linki mi?
        if (playdl.yt_validate(query) === 'video') {
            songInfo = await playdl.video_basic_info(query);
        } else {
            // Arama yap
            const results = await playdl.search(query, { limit: 1 });
            if (results.length === 0) return null;
            songInfo = await playdl.video_basic_info(results[0].url);
        }

        const info = songInfo.video_details;
        
        // Süre kontrolü
        const duration = parseInt(info.durationInSec);
        if (duration > CONFIG.MAX_DURATION) {
            return { error: 'Çok uzun', duration };
        }

        return {
            title: info.title,
            url: info.url,
            duration: formatDuration(duration),
            durationSec: duration,
            thumbnail: info.thumbnails[0]?.url || null
        };
    } catch (error) {
        console.error('Şarkı bilgisi alınamadı:', error);
        return null;
    }
}

// --- Süreyi formatla ---
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// =============================================================================
//                             5. BOT EVENTS
// =============================================================================
client.once('ready', async () => {
    console.log(`\n=============================================`);
    console.log(`✅ BOT GİRİŞ YAPTI: ${client.user.tag}`);
    console.log(`🆔 BOT ID: ${client.user.id}`);
    console.log(`🎵 MÜZİK SİSTEMİ AKTİF`);
    console.log(`=============================================\n`);
    
    // 7/24 ses bağlantısı
    connectToVoice();

    // Dinamik durum döngüsü
    let index = 0;
    setInterval(() => {
        let totalVoice = 0;
        client.guilds.cache.forEach(g => totalVoice += g.voiceStates.cache.size);

        const activities = [
            `SAHO CHEATS`,
            `🔊 ${totalVoice} Kişi Seste`,
            `🎵 /oynat ile müzik çal`,
            `🛡️ Loader: ${loaderStatus}`,
            `7/24 Destek Hattı`
        ];

        client.user.setActivity({ name: activities[index], type: ActivityType.Playing });
        index = (index + 1) % activities.length;
    }, 5000); 

    // Lisans süre kontrolü
    setInterval(async () => {
        const data = await firebaseRequest('get', '');
        if (!data) return;
        
        const today = new Date();
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("_") || typeof value !== 'string') continue;
            
            let parts = value.split(',');
            if (parts[2] === 'bitik') continue;
            
            const startDate = new Date(parts[3]);
            const expiryDate = new Date(startDate);
            expiryDate.setDate(startDate.getDate() + parseInt(parts[1]));
            
            if (today > expiryDate) {
                parts[2] = 'bitik';
                await firebaseRequest('put', key, parts.join(','));
                console.log(`❌ [AUTO] Süre doldu: ${key}`);
            }
        }
    }, 3600000);

    // Komut yükleme
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar API\'ye yükleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Komutlar başarıyla yüklendi!');
    } catch (e) { console.error('Komut hatası:', e); }
});

// 7/24 ses bağlantısı
async function connectToVoice() {
    const guild = client.guilds.cache.get(CONFIG.VOICE_GUILD_ID);
    if (!guild) return console.log("❌ [SES] Hedef sunucu bulunamadı!");

    const channel = guild.channels.cache.get(CONFIG.VOICE_CHANNEL_ID);
    if (!channel) return console.log("❌ [SES] Hedef ses kanalı bulunamadı!");

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        console.log(`🔊 [SES] ${channel.name} kanalına bağlanıldı!`);

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log("⚠️ [SES] Bağlantı koptu! Tekrar bağlanılıyor...");
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                connectToVoice();
            }
        });

    } catch (error) {
        console.error("❌ [SES HATASI]:", error);
        setTimeout(connectToVoice, 5000);
    }
}

// Hoş geldin mesajı
client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(ch => ch.name.includes('gelen') || ch.name.includes('kayıt') || ch.name.includes('chat'));
    if (!channel) return;
    
    const embed = new EmbedBuilder()
        .setTitle('🚀 SAHO CHEATS AİLESİNE HOŞ GELDİN!')
        .setDescription(`Selam **${member.user}**! \nSeninle birlikte **${member.guild.memberCount}** kişi olduk.\n\n🎵 **/oynat** komutuyla müzik çalabilirsin!`)
        .setColor(CONFIG.EMBED_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'SAHO CHEATS Community' });
        
    channel.send({ content: `${member.user}`, embeds: [embed] });
});

// Oto cevap
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    if (content.includes('fiyat') || content.includes('kaç tl') || content.includes('ne kadar')) {
        message.reply({ 
            content: `👋 Merhaba **${message.author.username}**! \n💰 Güncel fiyat listesi için <#${CONFIG.LOG_CHANNEL_ID}> kanalına bakabilir veya \`/ticket-kur\` komutuyla ticket açarak öğrenebilirsin.`,
            allowedMentions: { repliedUser: true }
        });
    }

    if (content.includes('nasıl alırım') || content.includes('satın al') || content.includes('ödeme')) {
        message.reply({ 
            content: `🛒 Satın almak için lütfen **Ticket** açınız. Yetkililerimiz size yardımcı olacaktır.`,
            allowedMentions: { repliedUser: true }
        });
    }
});

// =============================================================================
//                             6. ETKİLEŞİM YÖNETİCİSİ
// =============================================================================
client.on('interactionCreate', async interaction => {
    try {
        const blacklist = await firebaseRequest('get', '_BLACKLIST_');
        if (blacklist && blacklist[interaction.user.id]) {
            return interaction.reply({ content: '⛔ **SİSTEM TARAFINDAN ENGELLENDİNİZ.**', ephemeral: true });
        }
        
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isChatInputCommand()) return handleCommand(interaction);
    } catch (e) { console.error('Etkileşim Hatası:', e); }
});

// =============================================================================
//                             7. SLASH KOMUT HANDLER
// =============================================================================
async function handleCommand(interaction) {
    const { commandName, options, user, guild } = interaction;

    // ==================== MÜZİK KOMUTLARI ====================
    
    // --- OYNAT ---
    if (commandName === 'oynat') {
        await interaction.deferReply();
        
        const query = options.getString('sarki');
        
        // Ses kanalı kontrolü
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Bir ses kanalında olmalısın!**')
                    .setColor(CONFIG.ERROR_COLOR)]
            });
        }

        // Şarkı bilgilerini al
        const songInfo = await getSongInfo(query);
        if (!songInfo) {
            return interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Şarkı bulunamadı!**')
                    .setColor(CONFIG.ERROR_COLOR)]
            });
        }

        if (songInfo.error === 'Çok uzun') {
            return interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription(`❌ **Şarkı çok uzun!** Maksimum süre: ${CONFIG.MAX_DURATION / 60} dakika`)
                    .setColor(CONFIG.ERROR_COLOR)]
            });
        }

        const guildId = guild.id;
        
        // Kuyruğu al veya oluştur
        if (!musicQueues.has(guildId)) {
            musicQueues.set(guildId, []);
        }
        
        const queue = musicQueues.get(guildId);
        
        // Kuyruk limiti kontrolü
        if (queue.length >= CONFIG.MAX_QUEUE_SIZE) {
            return interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription(`❌ **Kuyruk dolu!** Maksimum: ${CONFIG.MAX_QUEUE_SIZE} şarkı`)
                    .setColor(CONFIG.ERROR_COLOR)]
            });
        }

        // Şarkıyı kuyruğa ekle
        const song = {
            ...songInfo,
            requesterId: user.id,
            volume: CONFIG.DEFAULT_VOLUME,
            loop: false
        };

        queue.push(song);

        // Şu an çalma mesajını oluştur (ilk şarkıysa)
        if (queue.length === 1) {
            const connection = await connectToVoiceChannel(interaction);
            if (!connection) return;

            const nowPlayingMsg = await interaction.channel.send({ 
                embeds: [new EmbedBuilder()
                    .setTitle('🎵 Şarkı Kuyruğa Eklendi')
                    .setDescription(`**${song.title}** sıraya eklendi!`)
                    .setColor(CONFIG.SUCCESS_COLOR)]
            });

            nowPlayingMessages.set(guildId, {
                channelId: interaction.channel.id,
                messageId: nowPlayingMsg.id
            });

            await playNext(guildId);
            
            await interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ **${song.title}** çalmaya başlıyor!`)
                    .setColor(CONFIG.SUCCESS_COLOR)]
            });
        } else {
            await interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setDescription(`✅ **${song.title}** kuyruğa eklendi! Sıra: ${queue.length}`)
                    .setColor(CONFIG.SUCCESS_COLOR)]
            });
        }
    }

    // --- DURDUR ---
    if (commandName === 'durdur') {
        const guildId = guild.id;
        const connection = musicConnections.get(guildId);
        
        if (!connection) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Bot ses kanalında değil!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        connection.destroy();
        musicConnections.delete(guildId);
        musicPlayers.delete(guildId);
        musicQueues.delete(guildId);
        nowPlayingMessages.delete(guildId);

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription('⏹️ **Müzik durduruldu ve sesten çıkıldı!**')
                .setColor(CONFIG.ERROR_COLOR)]
        });
    }

    // --- ŞARKI ATLA ---
    if (commandName === 'sarkiatla') {
        const guildId = guild.id;
        const player = musicPlayers.get(guildId);
        const queue = musicQueues.get(guildId);

        if (!player || !queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        player.stop();
        
        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription('⏭️ **Şarkı atlandı!**')
                .setColor(CONFIG.SUCCESS_COLOR)]
        });
    }

    // --- DURAKLAT ---
    if (commandName === 'duraklat') {
        const guildId = guild.id;
        const player = musicPlayers.get(guildId);

        if (!player) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        if (player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('⏸️ **Şarkı duraklatıldı!**')
                    .setColor(CONFIG.INFO_COLOR)]
            });
        } else {
            interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Şarkı zaten duraklatılmış!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }
    }

    // --- DEVAM ---
    if (commandName === 'devam') {
        const guildId = guild.id;
        const player = musicPlayers.get(guildId);

        if (!player) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        if (player.state.status === AudioPlayerStatus.Paused) {
            player.unpause();
            interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('▶️ **Şarkı devam ediyor!**')
                    .setColor(CONFIG.SUCCESS_COLOR)]
            });
        } else {
            interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Şarkı duraklatılmamış!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }
    }

    // --- SES ---
    if (commandName === 'ses') {
        const guildId = guild.id;
        const volume = options.getInteger('seviye');
        const player = musicPlayers.get(guildId);
        const queue = musicQueues.get(guildId);

        if (!player || !queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        // Aktif şarkının sesini değiştir
        const currentSong = queue[0];
        currentSong.volume = volume;

        // Oynatıcıda aktif resource varsa sesini değiştir
        const resource = player.state.resource;
        if (resource?.volume) {
            resource.volume.setVolumeLogarithmic(volume / 100);
        }

        await updateNowPlayingMessage(guildId, currentSong);

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription(`🔊 **Ses seviyesi ${volume}% olarak ayarlandı!**`)
                .setColor(CONFIG.SUCCESS_COLOR)]
        });
    }

    // --- KUYRUK ---
    if (commandName === 'kuyruk') {
        const guildId = guild.id;
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('📜 **Kuyruk boş!**')
                    .setColor(CONFIG.INFO_COLOR)],
                ephemeral: true 
            });
        }

        let description = '';
        queue.forEach((song, index) => {
            if (index === 0) {
                description += `**Şu an çalıyor:**\n`;
                description += `**${index + 1}.** [${song.title}](${song.url}) - ${song.duration} (İsteyen: <@${song.requesterId}>)\n\n`;
                description += `**Sıradakiler:**\n`;
            } else {
                description += `**${index + 1}.** [${song.title}](${song.url}) - ${song.duration} (İsteyen: <@${song.requesterId}>)\n`;
            }
        });

        if (description.length > 4000) {
            description = description.substring(0, 4000) + '...';
        }

        const embed = new EmbedBuilder()
            .setTitle('📜 Müzik Kuyruğu')
            .setDescription(description)
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: `Toplam ${queue.length} şarkı` });

        interaction.reply({ embeds: [embed] });
    }

    // --- TEKRAR ---
    if (commandName === 'tekrar') {
        const guildId = guild.id;
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Kuyrukta şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        queue[0].loop = !queue[0].loop;

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription(queue[0].loop ? '🔄 **Tekrar modu açıldı!**' : '➡️ **Tekrar modu kapatıldı!**')
                .setColor(queue[0].loop ? CONFIG.SUCCESS_COLOR : CONFIG.INFO_COLOR)]
        });
    }

    // --- KARIŞTIR ---
    if (commandName === 'karistir') {
        const guildId = guild.id;
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length <= 2) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Karıştırmak için en az 2 şarkı olmalı!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        // Şu an çalanı ayır, kalanları karıştır
        const current = queue.shift();
        for (let i = queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [queue[i], queue[j]] = [queue[j], queue[i]];
        }
        queue.unshift(current);

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription('🔀 **Kuyruk karıştırıldı!**')
                .setColor(CONFIG.SUCCESS_COLOR)]
        });
    }

    // --- TEMİZLE KUYRUK ---
    if (commandName === 'temizlekuyruk') {
        const guildId = guild.id;
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Kuyruk zaten boş!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        // Şu an çalan hariç temizle
        const current = queue[0];
        musicQueues.set(guildId, [current]);

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription('🧹 **Kuyruktaki diğer şarkılar temizlendi!**')
                .setColor(CONFIG.SUCCESS_COLOR)]
        });
    }

    // --- ŞARKI KALDIR ---
    if (commandName === 'sarkikaldir') {
        const guildId = guild.id;
        const sira = options.getInteger('sira');
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length < sira) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Geçersiz sıra numarası!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        if (sira === 1) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Şu an çalan şarkıyı kaldırmak için /sarkiatla kullan!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        const removed = queue.splice(sira - 1, 1)[0];

        interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setDescription(`✅ **${removed.title}** kuyruktan kaldırıldı!`)
                .setColor(CONFIG.SUCCESS_COLOR)]
        });
    }

    // --- ÇALAN ---
    if (commandName === 'calan') {
        const guildId = guild.id;
        const queue = musicQueues.get(guildId);

        if (!queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        const current = queue[0];
        const embed = new EmbedBuilder()
            .setTitle('🎵 Şu Anda Çalıyor')
            .setDescription(`**[${current.title}](${current.url})**`)
            .addFields(
                { name: '⏱️ Süre', value: current.duration, inline: true },
                { name: '👤 İsteyen', value: `<@${current.requesterId}>`, inline: true },
                { name: '🔊 Ses', value: `${current.volume}%`, inline: true }
            )
            .setThumbnail(current.thumbnail)
            .setColor(CONFIG.SUCCESS_COLOR);

        interaction.reply({ embeds: [embed] });
    }

    // ==================== DİĞER KOMUTLAR ====================
    
    // --- NUKE ---
    if (commandName === 'nuke') {
        const channel = interaction.channel;
        const position = channel.position;
        const topic = channel.topic;
        
        await interaction.reply('☢️ **Kanal patlatılıyor...**');
        
        const newChannel = await channel.clone();
        await newChannel.setPosition(position);
        if (topic) await newChannel.setTopic(topic);
        
        await channel.delete();
        
        const nukeEmbed = new EmbedBuilder()
            .setTitle('☢️ KANAL TEMİZLENDİ')
            .setDescription('Bu kanal **SAHO CHEATS** yönetim tarafından sıfırlandı.')
            .setImage('https://media1.tenor.com/m/X9kZ5h7qK64AAAAC/nuclear-bomb-explosion.gif')
            .setColor(CONFIG.ERROR_COLOR);
            
        await newChannel.send({ embeds: [nukeEmbed] });
    }

    // --- LOCK / UNLOCK ---
    if (commandName === 'lock') {
        await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
        interaction.reply({ embeds: [new EmbedBuilder().setDescription('🔒 **Kanal kilitlendi.**').setColor(CONFIG.ERROR_COLOR)] });
    }
    if (commandName === 'unlock') {
        await interaction.channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: true });
        interaction.reply({ embeds: [new EmbedBuilder().setDescription('🔓 **Kanal kilidi açıldı.**').setColor(CONFIG.SUCCESS_COLOR)] });
    }

    // --- FORMAT ---
    if (commandName === 'format') {
        const urun = options.getString('urun');
        const haftalik = options.getString('haftalik');
        const aylik = options.getString('aylik');
        
        const gorsel1 = options.getAttachment('gorsel1');
        const gorsel2 = options.getAttachment('gorsel2');
        const gorsel3 = options.getAttachment('gorsel3');
        const gorsel4 = options.getAttachment('gorsel4');

        const embeds = [];

        const mainEmbed = new EmbedBuilder()
            .setTitle(`💎 ${urun}`)
            .setDescription(`
            > **${urun}** en güncel sürümüyle stoklarda!
            > Satın almak için: <#${CONFIG.LOG_CHANNEL_ID}> (Ticket)
            
            🛡️ **Durum:** ${loaderStatus}  |  🚀 **Teslimat:** Anında
            `)
            .setColor(CONFIG.GOLD_COLOR)
            .addFields(
                { name: '📅 Haftalık', value: `\`\`\`${haftalik}\`\`\``, inline: true },
                { name: '🗓️ Aylık', value: `\`\`\`${aylik}\`\`\``, inline: true }
            )
            .setImage(gorsel1.url)
            .setFooter({ text: 'SAHO CHEATS Marketplace', iconURL: guild.iconURL() });
        
        embeds.push(mainEmbed);

        if (gorsel2) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel2.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel3) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel3.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel4) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel4.url).setColor(CONFIG.GOLD_COLOR));

        await interaction.channel.send({ embeds: embeds });
        await interaction.reply({ content: '✅ Vitrin güncellendi!', ephemeral: true });
    }

    // --- TICKET KUR ---
    if (commandName === 'ticket-kur') {
        const embed = new EmbedBuilder()
            .setTitle('🔥 SAHO CHEATS | DESTEK MERKEZİ')
            .setDescription(`
            **Değerli Müşterimiz, Hoş Geldiniz!**
            
            SAHO CHEATS olarak size en kaliteli hizmeti sunuyoruz.
            Lütfen işleminize uygun kategoriyi **aşağıdaki menüden** seçiniz.
            `)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/4712/4712109.png')
            .setFooter({ text: 'SAHO CHEATS Security Systems' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_create_menu')
            .setPlaceholder('👉 Bir kategori seçin...')
            .addOptions(
                { label: 'Satın Alım & Fiyatlar', description: 'Hile satın almak ve fiyat öğrenmek için.', value: 'cat_buy', emoji: '💳' },
                { label: 'Teknik Destek', description: 'Kurulum ve teknik sorunlar.', value: 'cat_tech', emoji: '🛠️' },
                { label: 'Diğer / Ortaklık', description: 'Reklam ve genel sorular.', value: 'cat_other', emoji: '🤝' }
            );

        const row = new ActionRowBuilder().addComponents(menu);

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Menülü ticket sistemi kuruldu!', ephemeral: true });
    }

    // --- SSS ---
    if (commandName === 'sss') {
        const embed = new EmbedBuilder()
            .setTitle('❓ SIKÇA SORULAN SORULAR')
            .setDescription('Aşağıdaki menüden merak ettiğiniz konuyu seçin.')
            .setColor(CONFIG.INFO_COLOR)
            .setFooter({ text: 'SAHO CHEATS Knowledge Base' });
            
        const menu = new StringSelectMenuBuilder()
            .setCustomId('faq_select')
            .setPlaceholder('Bir konu seçin...')
            .addOptions(
                { label: 'Ban Riski Var Mı?', description: 'Güvenlik durumu hakkında bilgi.', value: 'faq_ban', emoji: '🛡️' },
                { label: 'Nasıl Satın Alırım?', description: 'Ödeme yöntemleri ve teslimat.', value: 'faq_buy', emoji: '💳' },
                { label: 'İade Var Mı?', description: 'İade politikamız.', value: 'faq_refund', emoji: '🔄' },
                { label: 'Destek Saatleri', description: 'Ne zaman cevap alabilirim?', value: 'faq_support', emoji: '⏰' },
                { label: 'Kurulum Zor Mu?', description: 'Teknik bilgi gerekir mi?', value: 'faq_install', emoji: '🛠️' }
            );
            
        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    // --- HELP ---
    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('📚 SAHO CHEATS | BOT YARDIM MENÜSÜ')
            .setColor(CONFIG.EMBED_COLOR)
            .setDescription('Botun tüm komutları aşağıda listelenmiştir.')
            .addFields(
                { name: '🎵 **Müzik Komutları**', value: '> `/oynat`, `/durdur`, `/sarkiatla`, `/duraklat`\n> `/devam`, `/ses`, `/kuyruk`, `/tekrar`\n> `/karistir`, `/temizlekuyruk`, `/sarkikaldir`, `/calan`' },
                { name: '👤 **Kullanıcı Komutları**', value: '> `/lisansim`, `/cevir`, `/sss`, `/referans`' },
                { name: '🛡️ **Yetkili Komutları**', value: '> `/format`, `/ticket-kur`, `/durum-guncelle`, `/loader-durum`\n> `/dm`, `/nuke`, `/lock`, `/unlock`, `/kick`, `/ban`\n> `/vip-ekle`, `/tum-lisanslar`' }
            )
            .setFooter({ text: 'SAHO CHEATS Automation' });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // --- TUM LISANSLAR ---
    if (commandName === 'tum-lisanslar') {
        await interaction.deferReply({ ephemeral: true });
        const data = await firebaseRequest('get', '');
        if (!data) return interaction.editReply('Veri bulunamadı.');
        let text = "**📜 AKTİF LİSANSLAR LİSTESİ**\n\n";
        let count = 0;
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith("_") || typeof value !== 'string') continue;
            let parts = value.split(',');
            if (parts[4] !== "0") { 
                text += `🔑 \`${key}\` - <@${parts[4]}> (${parts[7] || 'NORMAL'})\n`; 
                count++; 
            }
        }
        if (count === 0) text += "🚫 Hiçbir kullanıcıya lisans tanımlanmamış.";
        const embed = new EmbedBuilder().setDescription(text.substring(0, 4000)).setColor(CONFIG.EMBED_COLOR).setFooter({ text: `Toplam ${count} aktif lisans` });
        interaction.editReply({ embeds: [embed] });
    }

    // --- LOADER DURUM ---
    if (commandName === 'loader-durum') {
        loaderStatus = options.getString('durum');
        interaction.reply({ content: `🛡️ Loader durumu güncellendi: **${loaderStatus}**`, ephemeral: true });
    }

    // --- LİSANSIM ---
    if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ **Sisteme kayıtlı bir lisansınız bulunmamaktadır.**');
        interaction.editReply(createPanelPayload(result.key, result.parts));
    }

    // --- DM ---
    if (commandName === 'dm') {
        const targetUser = options.getUser('kullanici');
        const msg = options.getString('mesaj');
        try {
            const embed = new EmbedBuilder()
                .setTitle('📨 SAHO CHEATS MESAJ')
                .setDescription(msg)
                .setColor(CONFIG.EMBED_COLOR)
                .setFooter({text:'Bu mesaj yetkililer tarafından gönderildi.'});
            await targetUser.send({embeds: [embed]});
            interaction.reply({content:`✅ Mesaj **${targetUser.tag}** kullanıcısına gönderildi.`, ephemeral:true});
        } catch (e) {
            interaction.reply({content:'❌ Kullanıcının DM kutusu kapalı.', ephemeral:true});
        }
    }

    // --- KICK ---
    if (commandName === 'kick') {
        const targetUser = options.getUser('kullanici');
        const reason = options.getString('sebep') || 'Sebep belirtilmedi';
        const member = guild.members.cache.get(targetUser.id);
        if (!member) return interaction.reply({content:'Kullanıcı sunucuda bulunamadı.', ephemeral:true});
        if (!member.kickable) return interaction.reply({content:'Bu kullanıcıyı atamam (Yetkim yetersiz).', ephemeral:true});
        await member.kick(reason);
        const embed = new EmbedBuilder()
            .setTitle('👢 KICK İŞLEMİ')
            .setDescription(`**Atılan:** ${targetUser.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${user.tag}`)
            .setColor(CONFIG.ERROR_COLOR);
        interaction.reply({embeds: [embed]});
    }

    // --- BAN ---
    if (commandName === 'ban') {
        const targetUser = options.getUser('kullanici');
        const reason = options.getString('sebep') || 'Sebep yok';
        const member = guild.members.cache.get(targetUser.id);
        if (!member) return interaction.reply({ content: '❌ Kullanıcı yok.', ephemeral: true });
        if (!member.bannable) return interaction.reply({ content: '❌ Yasaklayamıyorum.', ephemeral: true });
        await member.ban({ reason: reason });
        interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔨 YASAKLAMA').setDescription(`**Yasaklanan:** ${targetUser.tag}\n**Sebep:** ${reason}`).setColor(CONFIG.ERROR_COLOR)] });
    }

    // --- UNBAN ---
    if (commandName === 'unban') {
        const targetId = options.getString('id');
        try { 
            await guild.members.unban(targetId); 
            interaction.reply({ content: `✅ **${targetId}** yasağı kaldırıldı.`, ephemeral: true }); 
        } catch (error) { 
            interaction.reply({ content: '❌ Hata.', ephemeral: true }); 
        }
    }

    // --- BAKIM MODU ---
    if (commandName === 'bakim-modu') {
        isMaintenanceEnabled = options.getBoolean('durum');
        interaction.reply({content: `🔒 Bakım: ${isMaintenanceEnabled}`, ephemeral:true});
    }

    // --- TEMİZLE ---
    if (commandName === 'temizle') {
        const amount = options.getInteger('sayi');
        await interaction.channel.bulkDelete(amount, true).catch(() => {});
        interaction.reply({ content: `🧹 **${amount}** mesaj silindi.`, ephemeral: true });
    }

    // --- DUYURU ---
    if (commandName === 'duyuru') {
        const mesaj = options.getString('mesaj');
        const targetChannel = options.getChannel('kanal') || interaction.channel;
        const embed = new EmbedBuilder()
            .setTitle('📢 SAHO CHEATS DUYURU')
            .setDescription(mesaj)
            .setColor(CONFIG.EMBED_COLOR)
            .setFooter({ text: guild.name })
            .setTimestamp();
        await targetChannel.send({ content: '@everyone', embeds: [embed] });
        interaction.reply({ content: '✅', ephemeral: true });
    }

    // --- SUNUCU BİLGİ ---
    if (commandName === 'sunucu-bilgi') {
        const embed = new EmbedBuilder()
            .setTitle(`📊 ${guild.name}`)
            .addFields(
                { name: '👥 Üye', value: `${guild.memberCount}`, inline: true },
                { name: '🎵 Müzik', value: musicQueues.has(guild.id) ? 'Aktif' : 'Pasif', inline: true }
            )
            .setColor(CONFIG.EMBED_COLOR);
        interaction.reply({ embeds: [embed] });
    }

    // --- KARA LİSTE ---
    if (commandName === 'karaliste-ekle') {
        const target = options.getUser('kullanici');
        await firebaseRequest('patch', '_BLACKLIST_', { [target.id]: "BAN" });
        interaction.reply({ content: `⛔ **${target.tag}** engellendi.`, ephemeral: true });
    }
    if (commandName === 'karaliste-cikar') {
        const target = options.getUser('kullanici');
        const url = `${CONFIG.FIREBASE_URL}_BLACKLIST_/${target.id}.json?auth=${CONFIG.FIREBASE_SECRET}`;
        await axios.delete(url);
        interaction.reply({ content: `✅ **${target.tag}** engeli kalktı.`, ephemeral: true });
    }

    // --- DURUM GÜNCELLE ---
    if (commandName === 'durum-guncelle') {
        const urun = options.getString('urun');
        const durum = options.getString('durum');
        let color, statusText, emoji;
        if (durum === 'safe') { color = 'Green'; statusText = 'SAFE / GÜVENLİ'; emoji = '🟢'; }
        else if (durum === 'detected') { color = 'Red'; statusText = 'DETECTED / RİSKLİ'; emoji = '🔴'; }
        else { color = 'Yellow'; statusText = 'UPDATING / BAKIMDA'; emoji = '🟡'; }
        const embed = new EmbedBuilder()
            .setTitle(`${emoji} DURUM BİLGİSİ`)
            .addFields(
                { name: '📂 Yazılım', value: `**${urun}**`, inline: true }, 
                { name: '📡 Durum', value: `\`${statusText}\``, inline: true }
            )
            .setColor(color)
            .setFooter({ text: 'SAHO CHEATS Status' });
        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅', ephemeral: true });
    }

    // --- ÇARK ---
    if (commandName === 'cark-hak-ekle') {
        const target = options.getUser('kullanici');
        const adet = options.getInteger('adet');
        let currentRight = await firebaseRequest('get', `_SPIN_RIGHTS_/${target.id}`);
        if (!currentRight) currentRight = 0; else currentRight = parseInt(currentRight);
        await firebaseRequest('put', `_SPIN_RIGHTS_/${target.id}`, currentRight + adet);
        interaction.reply({ content: `✅ **${target.tag}** kullanıcısına **+${adet}** hak eklendi.`, ephemeral: true });
    }
    
    if (commandName === 'cark-oranlar') {
        const embed = new EmbedBuilder()
            .setTitle('🎡 SAHO CHEATS | ORANLAR')
            .setDescription('💎 %0.5 External\n🔥 %1.5 Bypass\n👑 %3.0 Mod Menü\n🎫 %10 İndirim\n❌ %85 PAS')
            .setColor('Gold');
        interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'referans') {
        const puan = options.getInteger('puan');
        const yorum = options.getString('yorum');
        const stars = '⭐'.repeat(puan);
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.username} referans bıraktı!`, iconURL: user.displayAvatarURL() })
            .setDescription(`**Puan:** ${stars}\n**Yorum:** ${yorum}`)
            .setColor('Gold');
        const vouchChannel = guild.channels.cache.find(c => c.name.includes('referans') || c.name.includes('vouch'));
        if (vouchChannel) { 
            await vouchChannel.send({ embeds: [embed] }); 
            interaction.reply({ content: '❤️', ephemeral: true }); 
        } else interaction.reply({ content: 'Kanal bulunamadı.', ephemeral: true });
    }
    
    if (commandName === 'cevir') {
        await interaction.deferReply();
        let extraRights = await firebaseRequest('get', `_SPIN_RIGHTS_/${user.id}`);
        if (!extraRights) extraRights = 0; else extraRights = parseInt(extraRights);
        
        let usedExtra = false;
        if (extraRights > 0) {
            extraRights--;
            await firebaseRequest('put', `_SPIN_RIGHTS_/${user.id}`, extraRights);
            usedExtra = true;
        } else {
            const spinData = await firebaseRequest('get', `_SPIN_TIMES_/${user.id}`);
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (spinData) {
                const lastSpin = parseInt(spinData);
                if (now - lastSpin < cooldown) return interaction.editReply(`⏳ **Günlük hakkın doldu!**\nTekrar denemek için: <t:${Math.floor((lastSpin + cooldown) / 1000)}:R>`);
            }
            await firebaseRequest('patch', '_SPIN_TIMES_', { [user.id]: now });
        }

        const items = [
            { name: "1 AYLIK EXTERNAL 💎", chance: 5, type: 'legendary' },
            { name: "1 HAFTALIK BYPASS 🔥", chance: 15, type: 'epic' },
            { name: "1 GÜNLÜK MOD MENU 👑", chance: 30, type: 'rare' },
            { name: "%10 İndirim Kuponu 🎫", chance: 100, type: 'common' },
            { name: "PAS (Tekrar Dene) ❌", chance: 850, type: 'lose' }
        ];

        const totalWeight = items.reduce((sum, item) => sum + item.chance, 0);
        let random = Math.floor(Math.random() * totalWeight);
        let selectedItem = items[0];
        for (const item of items) { 
            if (random < item.chance) { 
                selectedItem = item; 
                break; 
            } 
            random -= item.chance; 
        }

        let color = CONFIG.EMBED_COLOR;
        let description = "";
        let footerText = usedExtra ? `Ekstra hak kullanıldı. Kalan: ${extraRights}` : `${user.username} günlük hakkını kullandı`;

        if (selectedItem.type === 'legendary' || selectedItem.type === 'epic' || selectedItem.type === 'rare') { 
            color = 'Gold'; 
            description = `🎉 **TEBRİKLER! ÖDÜL KAZANDIN!**\n\nKazandığın: **${selectedItem.name}**\n\n*Hemen ticket aç ve bu ekranın görüntüsünü at!*`; 
        } else if (selectedItem.type === 'lose') { 
            color = 'Red'; 
            description = `📉 **Maalesef...**\n\nSonuç: **${selectedItem.name}**\n\n*Yarın tekrar gel veya hak satın al!*`; 
        } else { 
            color = 'Blue'; 
            description = `👍 **Fena Değil!**\n\nKazandığın: **${selectedItem.name}**\n*Ticket açıp indirimini kullanabilirsin.*`; 
        }
        
        const embed = new EmbedBuilder()
            .setTitle('🎡 SAHO CHEATS ÇARKIFELEK')
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: footerText });
            
        await interaction.editReply({ embeds: [embed] });
    }

    // --- LİSANS İŞLEMLERİ ---
    if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') { 
            await interaction.deferReply({ ephemeral: true }); 
            const data = await firebaseRequest('get', ''); 
            if (!data) return interaction.editReply('Veri yok.'); 
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); 
            const adet = options.getInteger('adet'); 
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma'; 
            const menu = new StringSelectMenuBuilder()
                .setCustomId(`add_right_${type}_${adet}`)
                .setPlaceholder('Key Seç...')
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('➕'))); 
            interaction.editReply({ content: `👇 **${type.toUpperCase()} Ekle:**`, components: [new ActionRowBuilder().addComponents(menu)] }); 
            return; 
        }
        if (commandName === 'sil') { 
            await interaction.deferReply({ ephemeral: true }); 
            const data = await firebaseRequest('get', ''); 
            if (!data) return interaction.editReply('Veri yok.'); 
            const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); 
            const menu = new StringSelectMenuBuilder()
                .setCustomId('delete_key')
                .setPlaceholder('Sil...')
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️'))); 
            interaction.editReply({ content: '🗑️ **Sil:**', components: [new ActionRowBuilder().addComponents(menu)] }); 
            return; 
        }
        if (commandName.includes('ekle')) { 
            await interaction.deferReply({ ephemeral: true }); 
            const target = options.getUser('kullanici'); 
            const key = options.getString('key_ismi').toUpperCase(); 
            const gun = options.getInteger('gun'); 
            const isVip = commandName === 'vip-ekle'; 
            const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${isVip ? 'VIP' : 'NORMAL'}`; 
            await firebaseRequest('put', key, data); 
            const payload = createPanelPayload(key, data.split(',')); 
            sendLog(guild, `🚨 **LİSANS OLUŞTURULDU**\n**Yönetici:** ${user.tag}\n**Key:** ${key}`); 
            interaction.editReply({ content: `✅ **${target.username}** tanımlandı.` }); 
            try { 
                await target.send({ content: `🎉 **Lisansınız Hazır!**`, embeds: payload.embeds, components: payload.components }); 
            } catch (e) {} 
            return; 
        }
        if (commandName === 'olustur') { 
            const gun = options.getInteger('gun'); 
            let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase(); 
            await firebaseRequest('put', key.toUpperCase(), `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`); 
            interaction.reply({ content: `🔑 **Boş Key:** \`${key.toUpperCase()}\``, ephemeral: true }); 
        }
    }
}

// =============================================================================
//                             8. BUTON HANDLER
// =============================================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    // --- MÜZİK KONTROL BUTONLARI (YENİ) ---
    if (customId.startsWith('music_')) {
        const guildId = guild.id;
        const player = musicPlayers.get(guildId);
        const queue = musicQueues.get(guildId);

        if (!player || !queue || queue.length === 0) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setDescription('❌ **Çalan bir şarkı yok!**')
                    .setColor(CONFIG.ERROR_COLOR)],
                ephemeral: true 
            });
        }

        switch(customId) {
            case 'music_pause':
                if (player.state.status === AudioPlayerStatus.Playing) {
                    player.pause();
                    await interaction.reply({ 
                        embeds: [new EmbedBuilder()
                            .setDescription('⏸️ **Şarkı duraklatıldı!**')
                            .setColor(CONFIG.INFO_COLOR)],
                        ephemeral: true 
                    });
                }
                break;

            case 'music_skip':
                player.stop();
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setDescription('⏭️ **Şarkı atlandı!**')
                        .setColor(CONFIG.SUCCESS_COLOR)],
                    ephemeral: true 
                });
                break;

            case 'music_stop':
                const connection = musicConnections.get(guildId);
                if (connection) {
                    connection.destroy();
                    musicConnections.delete(guildId);
                }
                musicPlayers.delete(guildId);
                musicQueues.delete(guildId);
                nowPlayingMessages.delete(guildId);
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setDescription('⏹️ **Müzik durduruldu!**')
                        .setColor(CONFIG.ERROR_COLOR)],
                    ephemeral: true 
                });
                break;

            case 'music_volume_down':
                const newVolDown = Math.max(1, queue[0].volume - 10);
                queue[0].volume = newVolDown;
                const resourceDown = player.state.resource;
                if (resourceDown?.volume) {
                    resourceDown.volume.setVolumeLogarithmic(newVolDown / 100);
                }
                await updateNowPlayingMessage(guildId, queue[0]);
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setDescription(`🔉 **Ses ${newVolDown}% olarak ayarlandı!**`)
                        .setColor(CONFIG.SUCCESS_COLOR)],
                    ephemeral: true 
                });
                break;

            case 'music_volume_up':
                const newVolUp = Math.min(100, queue[0].volume + 10);
                queue[0].volume = newVolUp;
                const resourceUp = player.state.resource;
                if (resourceUp?.volume) {
                    resourceUp.volume.setVolumeLogarithmic(newVolUp / 100);
                }
                await updateNowPlayingMessage(guildId, queue[0]);
                await interaction.reply({ 
                    embeds: [new EmbedBuilder()
                        .setDescription(`🔊 **Ses ${newVolUp}% olarak ayarlandı!**`)
                        .setColor(CONFIG.SUCCESS_COLOR)],
                    ephemeral: true 
                });
                break;
        }
        return;
    }

    // --- TICKET KAPATMA ---
    if (customId === 'close_ticket') {
        const modal = new EmbedBuilder()
            .setDescription('🔒 **Ticket 5 saniye içinde kapatılıyor...**')
            .setColor(CONFIG.ERROR_COLOR);
        interaction.reply({ embeds: [modal] });
        sendLog(guild, `📕 **TICKET KAPANDI**\n**Kapatan:** ${user.tag}\n**Kanal:** ${channel.name}`);
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) 
            return interaction.reply({ content: '⛔ Yetkisiz!', ephemeral: true });
        channel.send({ embeds: [new EmbedBuilder()
            .setDescription(`✅ Bu talep **${user}** tarafından devralındı.`)
            .setColor(CONFIG.SUCCESS_COLOR)] });
    }

    // --- LİSANS İŞLEMLERİ ---
    if (['toggle', 'reset'].includes(customId)) {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ Lisans yok.');
        
        let { key, parts } = result;
        while (parts.length < 8) parts.push("0");
        const isVIP = parts[7] === 'VIP';
        const LIMITS = { 
            PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, 
            RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT 
        };
        let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

        if (customId === 'toggle') { 
            if (durum === 'aktif') { 
                if (!isVIP && pause >= LIMITS.PAUSE) return interaction.editReply('❌ Limit doldu.'); 
                durum = 'pasif'; pause++; 
            } else durum = 'aktif'; 
            parts[2] = durum; parts[5] = pause; 
        } 
        else if (customId === 'reset') { 
            if (reset >= LIMITS.RESET) return interaction.editReply('❌ Limit doldu.'); 
            parts[0] = 'bos'; reset++; parts[6] = reset; 
            sendLog(guild, `🔄 **HWID SIFIRLANDI**\n**Kullanıcı:** ${user.tag}\n**Key:** ${key}`); 
            interaction.editReply('✅ HWID Sıfırlandı!'); 
        }
        await firebaseRequest('put', key, parts.join(','));
        await interaction.editReply(createPanelPayload(key, parts));
    }
}

// =============================================================================
//                             9. SELECT MENU HANDLER
// =============================================================================
async function handleSelectMenu(interaction) {
    const { customId, values, user, guild } = interaction;

    // --- TICKET OLUŞTURMA MENÜSÜ ---
    if (customId === 'ticket_create_menu') {
        const category = values[0];

        if (isMaintenanceEnabled && !await checkPermission(user.id)) 
            return interaction.reply({ content: '🔒 Bakımdayız.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        
        const ticketNum = await getNextTicketNumber();
        const typePrefix = category.split('_')[1];
        const channelName = `${typePrefix}-${ticketNum}-${user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

        const ticketChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: interaction.channel.parentId,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.MASTER_VIEW_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ]
        });

        const controlEmbed = new EmbedBuilder()
            .setTitle('👋 Hoş Geldiniz')
            .setDescription(`Sayın **${user}**,\n\nTalep kategoriniz: **${typePrefix.toUpperCase()}**\nYetkililerimiz en kısa sürede dönüş yapacaktır.`)
            .setColor(CONFIG.EMBED_COLOR);

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Kapat & Arşivle').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Yetkili: Sahiplen').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️')
        );

        if (category === 'cat_buy') {
            const productMenu = new StringSelectMenuBuilder()
                .setCustomId('select_product')
                .setPlaceholder('📦 Hangi ürünü almak istiyorsunuz?')
                .addOptions(
                    { label: 'PC UID Bypass', value: 'prod_uid', emoji: '🛡️' },
                    { label: 'PC External', value: 'prod_external', emoji: '🔮' },
                    { label: 'PC Mod Menü', value: 'prod_modmenu', emoji: '👑' },
                    { label: 'PC Fake Lag', value: 'prod_fakelag', emoji: '💨' },
                    { label: 'Android Fake Lag', value: 'prod_android', emoji: '📱' }
                );
            
            await ticketChannel.send({ 
                content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, 
                embeds: [controlEmbed], 
                components: [new ActionRowBuilder().addComponents(productMenu), controlRow] 
            });
        } else {
            await ticketChannel.send({ 
                content: `${user} | <@&${CONFIG.SUPPORT_ROLE_ID}>`, 
                embeds: [controlEmbed], 
                components: [controlRow] 
            });
        }

        await interaction.editReply(`✅ Ticket açıldı: ${ticketChannel}`);
    }

    // --- SSS CEVAPLARI ---
    if (interaction.customId === 'faq_select') {
        const val = interaction.values[0];
        let title, desc;
        switch(val) {
            case 'faq_ban': title = '🛡️ Ban Riski Var Mı?'; desc = 'Yazılımlarımız %100 External ve güvenlidir. Ancak her hilede olduğu gibi düşük de olsa risk vardır. Legit (belli etmeden) oynarsanız sorun yaşamazsınız.'; break;
            case 'faq_buy': title = '💳 Nasıl Satın Alırım?'; desc = 'Satın almak için `#ticket-kur` kanalından "Satın Alım" ticketı oluşturun. IBAN, Papara ve Kripto kabul ediyoruz.'; break;
            case 'faq_refund': title = '🔄 İade Var Mı?'; desc = 'Dijital ürünlerde (Key teslim edildikten sonra) iade mümkün değildir. Ancak ürün bizden kaynaklı çalışmazsa iade yapılır.'; break;
            case 'faq_support': title = '⏰ Destek Saatleri'; desc = 'Otomatik sistemimiz 7/24 aktiftir. Yetkili ekibimiz genellikle 10:00 - 02:00 saatleri arasında canlı destek verir.'; break;
            case 'faq_install': title = '🛠️ Kurulum Zor Mu?'; desc = 'Hayır! Tek tıkla çalışan Loader sistemimiz mevcuttur. Ayrıca satın alım sonrası kurulum videosu iletmekteyiz.'; break;
        }
        await interaction.reply({ 
            embeds: [new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setColor(CONFIG.SUCCESS_COLOR)], 
            ephemeral: true 
        });
    }

    // --- MARKET FİYAT GÖSTERİMİ ---
    if (interaction.customId === 'select_product') {
        await interaction.deferReply({ ephemeral: true });
        const val = interaction.values[0];
        let title = "", priceInfo = "";
        switch(val) {
            case 'prod_uid': title = "🛡️ PC UID BYPASS"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Ban riskini ortadan kaldıran bypass.*"; break;
            case 'prod_external': title = "🔮 PC EXTERNAL"; priceInfo = "**📆 Haftalık:** 600₺\n**🗓️ Aylık:** 1500₺\n\n*Güvenli external yazılım.*"; break;
            case 'prod_modmenu': title = "👑 PC MOD MENÜ"; priceInfo = "**📆 Haftalık:** 700₺\n**🗓️ Aylık:** 2000₺\n\n*Full özellikli mod menü.*"; break;
            case 'prod_fakelag': title = "💨 PC FAKE LAG"; priceInfo = "**📆 Haftalık:** 200₺\n**♾️ SINIRSIZ:** 500₺\n\n*Laglı görünme sistemi.*"; break;
            case 'prod_android': title = "📱 ANDROID FAKE LAG"; priceInfo = "**🗓️ Aylık:** 800₺\n\n*Mobil özel.*"; break;
        }
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${priceInfo}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n💳 **SATIN ALMAK İÇİN:**\nLütfen bu kanala **IBAN** veya **PAPARA** yazarak ödeme bilgilerini isteyiniz.`)
            .setColor(CONFIG.EMBED_COLOR)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/2543/2543369.png');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // --- LİSANS MENÜLERİ ---
    if (interaction.customId === 'delete_key' || interaction.customId.startsWith('add_right_')) {
        if (!await checkPermission(interaction.user.id)) 
            return interaction.reply({ content: '⛔ Yetkisiz.', ephemeral: true });
            
        const key = interaction.values[0];
        if (interaction.customId === 'delete_key') { 
            await interaction.deferUpdate(); 
            await firebaseRequest('delete', key); 
            interaction.editReply({ content: `✅ **${key}** silindi!`, components: [] }); 
        } else {
            await interaction.deferUpdate();
            const [_, __, type, amountStr] = interaction.customId.split('_');
            const amount = parseInt(amountStr);
            const raw = await firebaseRequest('get', key);
            if (raw) {
                let p = raw.split(',');
                while (p.length < 8) p.push("0");
                let idx = type === 'hwid' ? 6 : 5;
                p[idx] = Math.max(0, parseInt(p[idx]) - amount);
                await firebaseRequest('put', key, p.join(','));
                sendLog(interaction.guild, `➕ **HAK EKLENDİ**\n**Admin:** ${interaction.user.tag}\n**Key:** ${key}\n**Miktar:** +${amount} ${type}`);
                interaction.editReply({ content: `✅ **${key}** için +${amount} **${type.toUpperCase()}** hakkı eklendi.`, components: [] });
            } else interaction.editReply({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

// =============================================================================
//                             10. CRASH ENGELLEYİCİ
// =============================================================================
process.on('unhandledRejection', error => { 
    console.error('Beklenmeyen Hata:', error); 
});

client.login(process.env.TOKEN);
