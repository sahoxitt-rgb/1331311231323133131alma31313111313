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
//  YENİ EKLENEN KÜTÜPHANE (SES İÇİN)
//  Bunu kullanmak için terminale: npm install @discordjs/voice yazmalısın.
// =============================================================================
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

const express = require('express');
const axios = require('axios');

// =============================================================================
//                             AYARLAR VE KONFİGÜRASYON
// =============================================================================
// Bu bölüm botun beynidir. Tüm ayarlar buradan yönetilir.
const CONFIG = {
    // ------------------- VERİTABANI BAĞLANTISI -------------------
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    
    // ------------------- YETKİLENDİRME -------------------
    // 🔥 BOT SAHİBİ (SENİN ID) - Tüm yetkilere sahiptir
    OWNER_ID: "1380526273431994449", 
    
    // TICKETLARI GÖRECEK VE YÖNETECEK ANA YETKİLİ ID
    MASTER_VIEW_ID: "1380526273431994449",
    
    // DESTEK EKİBİ ROL ID (Ticket kanalını görebilecek rol)
    SUPPORT_ROLE_ID: "1380526273431994449", 

    // ------------------- KANALLAR VE ROLLER -------------------
    // 👇 LOG KANALINI KESİN DOLDUR (Satın alım yönlendirmesi için önemli)
    LOG_CHANNEL_ID: "BURAYA_LOG_KANAL_ID_YAZ",       
    
    // MÜŞTERİ ROLÜ (Satın alanlara verilecek rol - Opsiyonel)
    CUSTOMER_ROLE_ID: "BURAYA_MUSTERI_ROL_ID_YAZ",    
    
    // ------------------- 7/24 SES AYARLARI (YENİ) -------------------
    VOICE_GUILD_ID: "1446824586808262709",    // Senin verdiğin Sunucu ID
    VOICE_CHANNEL_ID: "1465453822204969154",  // Senin verdiğin Ses Kanalı ID

    // ------------------- LİSANS SİSTEMİ LİMİTLERİ -------------------
    DEFAULT_PAUSE_LIMIT: 2, // Normal üye kaç kere durdurabilir
    DEFAULT_RESET_LIMIT: 1, // Normal üye kaç kere HWID sıfırlayabilir
    VIP_PAUSE_LIMIT: 999,   // VIP üye (Sınırsız)
    VIP_RESET_LIMIT: 5,     // VIP üye reset hakkı

    // ------------------- TASARIM (RENK PALETİ) -------------------
    EMBED_COLOR: '#2B2D31', // Koyu Discord Grisi (Ana Tema)
    SUCCESS_COLOR: '#57F287', // Başarılı İşlem Yeşili
    ERROR_COLOR: '#ED4245',   // Hata Kırmızısı
    INFO_COLOR: '#5865F2',    // Bilgi Mavisi
    GOLD_COLOR: '#F1C40F'     // Premium Altın Sarısı
};

// ------------------- GLOBAL DEĞİŞKENLER -------------------
// RAM üzerinde tutulan geçici veriler
let isMaintenanceEnabled = false; // Bakım modu kapalı başlar
let loaderStatus = "UNDETECTED 🟢"; // Loader durumu varsayılan olarak güvenli

// =============================================================================
//                             1. WEB SERVER (7/24 AKTİFLİK İÇİN)
// =============================================================================
// Render, Replit gibi platformlarda botun uyumasını engeller.
const app = express();

app.get('/', (req, res) => {
    res.send({ 
        status: 'Online', 
        system: 'SAHO CHEATS SYSTEM vFinal',
        time: new Date().toISOString()
    });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`🌍 [SERVER] Web sunucusu ${port} portunda başarıyla başlatıldı.`);
});

// =============================================================================
//                             2. BOT İSTEMCİSİ (CLIENT)
// =============================================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // Chat okumak için gerekli (Oto-Cevap)
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates // Seste kaç kişi var saymak için
    ], 
    partials: [Partials.Channel, Partials.Message, Partials.User] 
});

// =============================================================================
//                             3. KOMUT LİSTESİ VE TANIMLAMALAR
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
        .addAttachmentOption(o => o.setName('gorsel2').setDescription('Ek Resim 1 (İsteğe bağlı)').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel3').setDescription('Ek Resim 2 (İsteğe bağlı)').setRequired(false))
        .addAttachmentOption(o => o.setName('gorsel4').setDescription('Ek Resim 3 (İsteğe bağlı)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // ------------------- TICKET VE DESTEK -------------------
    new SlashCommandBuilder()
        .setName('ticket-kur')
        .setDescription('🎫 (Admin) Menülü (Select Menu) Ticket Panelini Kurar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sss')
        .setDescription('❓ Sıkça Sorulan Sorular (Ban riski, ödeme, iade vb.)'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('📚 Bot kullanım rehberi ve tüm komutlar.'),

    // ------------------- GÜVENLİK VE MODERASYON (YENİ EKLENENLER) -------------------
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('☢️ (Admin) Kanalı siler ve aynı özelliklerle yeniden oluşturur (Temizlik).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('lock')
        .setDescription('🔒 (Admin) Kanalı kilitler (Üyeler yazamaz).')
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

    // ------------------- ÇARKIFELEK (COIN YOK, SADECE HAK) -------------------
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

    // ------------------- LİSANS İŞLEMLERİ (CORE SYSTEM) -------------------
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
        if (key.startsWith("_")) continue; // Sistem dosyalarını atla
        if (typeof value === 'string') {
            const parts = value.split(',');
            // CSV Formatı: durum, süre, aktiflik, tarih, DISCORD_ID, pause, reset, tip
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

// --- LİSANS PANELİ OLUŞTURUCU (GÖRSEL ARAYÜZ) ---
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
            { name: '\u200B', value: '\u200B', inline: false }, // Boşluk
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
//                             5. BOT EVENTS (OLAYLAR)
// =============================================================================
client.once('ready', async () => {
    console.log(`\n=============================================`);
    console.log(`✅ BOT GİRİŞ YAPTI: ${client.user.tag}`);
    console.log(`🆔 BOT ID: ${client.user.id}`);
    console.log(`=============================================\n`);
    
    // 🔥🔥🔥 YENİ EKLENEN: 7/24 SES BAĞLANTISI BAŞLAT 🔥🔥🔥
    connectToVoice();

    // --- DİNAMİK DURUM DÖNGÜSÜ (HAREKETLİ PRESENCE) ---
    let index = 0;
    setInterval(() => {
        let totalVoice = 0;
        client.guilds.cache.forEach(g => totalVoice += g.voiceStates.cache.size);

        const activities = [
            `SAHO CHEATS`,
            `🔊 ${totalVoice} Kişi Seste`,
            `🛡️ Loader: ${loaderStatus}`,
            `7/24 Destek Hattı`,
            `discord.gg/sahocheats`
        ];

        client.user.setActivity({ name: activities[index], type: ActivityType.Playing });
        index = (index + 1) % activities.length;
    }, 5000); 

    // --- LİSANS SÜRE KONTROLÜ (CRON) ---
    // Her saat başı veritabanını kontrol edip süresi bitenleri kapatır.
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
    }, 3600000); // 1 Saat

    // --- KOMUT YÜKLEME ---
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try { 
        console.log('🔄 Komutlar API\'ye yükleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Komutlar başarıyla yüklendi!');
    } catch (e) { console.error('Komut hatası:', e); }
});

// 🔥🔥🔥 YENİ EKLENEN: SES BAĞLANTI FONKSİYONU 🔥🔥🔥
// Bu fonksiyon botu sese sokar, atılırsa geri sokar, sağır/sustur yapar.
async function connectToVoice() {
    const guild = client.guilds.cache.get(CONFIG.VOICE_GUILD_ID);
    if (!guild) return console.log("❌ [SES] Hedef sunucu bulunamadı! ID kontrol et.");

    const channel = guild.channels.cache.get(CONFIG.VOICE_CHANNEL_ID);
    if (!channel) return console.log("❌ [SES] Hedef ses kanalı bulunamadı! ID kontrol et.");

    try {
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,  // Kulaklık kapalı (sağır)
            selfMute: true   // Mikrofon kapalı (sustur)
        });

        console.log(`🔊 [SES] ${channel.name} kanalına bağlanıldı!`);

        // Bağlantı koparsa (Kick, Sunucu gitmesi vb.) anında tekrar dene
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            console.log("⚠️ [SES] Bağlantı koptu! Tekrar bağlanılıyor...");
            try {
                // Küçük bir bekleme yapıp tekrar bağlanmayı dener (spam koruması için)
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                // Eğer hızlıca toparlayamazsa bağlantıyı sıfırdan kur
                connection.destroy();
                connectToVoice();
            }
        });

    } catch (error) {
        console.error("❌ [SES HATASI]:", error);
        // Hata olursa 5 saniye sonra tekrar dene
        setTimeout(connectToVoice, 5000);
    }
}

// --- HOŞ GELDİN MESAJI ---
client.on('guildMemberAdd', async member => {
    const channel = member.guild.channels.cache.find(ch => ch.name.includes('gelen') || ch.name.includes('kayıt') || ch.name.includes('chat'));
    if (!channel) return;
    
    const embed = new EmbedBuilder()
        .setTitle('🚀 SAHO CHEATS AİLESİNE HOŞ GELDİN!')
        .setDescription(`Selam **${member.user}**! \nSeninle birlikte **${member.guild.memberCount}** kişi olduk.\n\nKalitenin ve güvenin tek adresi.`)
        .setColor(CONFIG.EMBED_COLOR)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: 'SAHO CHEATS Community' });
        
    channel.send({ content: `${member.user}`, embeds: [embed] });
});

// --- OTO CEVAP (AUTO REPLY - CHAT OKUMA) ---
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    // Fiyat Sorusu
    if (content.includes('fiyat') || content.includes('kaç tl') || content.includes('ne kadar')) {
        message.reply({ 
            content: `👋 Merhaba **${message.author.username}**! \n💰 Güncel fiyat listesi için <#${CONFIG.LOG_CHANNEL_ID}> kanalına bakabilir veya \`/ticket-kur\` komutuyla ticket açarak öğrenebilirsin.`,
            allowedMentions: { repliedUser: true }
        });
    }

    // Satın Alım Sorusu
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
        // --- GLOBAL KARA LİSTE KONTROLÜ ---
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

    // --- NUKE (KANAL PATLATMA) ---
    if (commandName === 'nuke') {
        const channel = interaction.channel;
        const position = channel.position;
        const topic = channel.topic;
        
        await interaction.reply('☢️ **Kanal patlatılıyor...**');
        
        // Kanalı kopyala
        const newChannel = await channel.clone();
        await newChannel.setPosition(position);
        if (topic) await newChannel.setTopic(topic);
        
        // Eskisini sil
        await channel.delete();
        
        // Yeni kanala mesaj at
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

    // --- FORMAT (ÜRÜN VİTRİNİ - KOMPAKT TASARIM) ---
    if (commandName === 'format') {
        const urun = options.getString('urun');
        const haftalik = options.getString('haftalik');
        const aylik = options.getString('aylik');
        
        const gorsel1 = options.getAttachment('gorsel1');
        const gorsel2 = options.getAttachment('gorsel2');
        const gorsel3 = options.getAttachment('gorsel3');
        const gorsel4 = options.getAttachment('gorsel4');

        const embeds = [];

        // 1. ANA EMBED (Kompakt ve Şık)
        const mainEmbed = new EmbedBuilder()
            .setTitle(`💎 ${urun}`)
            .setDescription(`
            > **${urun}** en güncel sürümüyle stoklarda!
            > Satın almak için: <#${CONFIG.LOG_CHANNEL_ID}> (Ticket)
            
            🛡️ **Durum:** ${loaderStatus}  |  🚀 **Teslimat:** Anında
            `)
            .setColor(CONFIG.GOLD_COLOR)
            .addFields(
                // Fiyatları yan yana ve kutucuk içinde gösteriyoruz
                { name: '📅 Haftalık', value: `\`\`\`${haftalik}\`\`\``, inline: true },
                { name: '🗓️ Aylık', value: `\`\`\`${aylik}\`\`\``, inline: true }
            )
            .setImage(gorsel1.url)
            .setFooter({ text: 'SAHO CHEATS Marketplace', iconURL: guild.iconURL() });
        
        embeds.push(mainEmbed);

        // 2. EKSTRA RESİMLER
        if (gorsel2) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel2.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel3) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel3.url).setColor(CONFIG.GOLD_COLOR));
        if (gorsel4) embeds.push(new EmbedBuilder().setURL('https://discord.gg/sahocheats').setImage(gorsel4.url).setColor(CONFIG.GOLD_COLOR));

        await interaction.channel.send({ embeds: embeds });
        await interaction.reply({ content: '✅ Vitrin güncellendi!', ephemeral: true });
    }

    // --- TICKET KUR (MENÜLÜ) ---
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
        const embed = new EmbedBuilder().setTitle('❓ SIKÇA SORULAN SORULAR').setDescription('Aşağıdaki menüden merak ettiğiniz konuyu seçin.').setColor(CONFIG.INFO_COLOR).setFooter({ text: 'SAHO CHEATS Knowledge Base' });
        const menu = new StringSelectMenuBuilder().setCustomId('faq_select').setPlaceholder('Bir konu seçin...').addOptions(
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
            const embed = new EmbedBuilder().setTitle('📨 SAHO CHEATS MESAJ').setDescription(msg).setColor(CONFIG.EMBED_COLOR).setFooter({text:'Bu mesaj yetkililer tarafından gönderildi.'});
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
        const embed = new EmbedBuilder().setTitle('👢 KICK İŞLEMİ').setDescription(`**Atılan:** ${targetUser.tag}\n**Sebep:** ${reason}\n**Yetkili:** ${user.tag}`).setColor(CONFIG.ERROR_COLOR);
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
        try { await guild.members.unban(targetId); interaction.reply({ content: `✅ **${targetId}** yasağı kaldırıldı.`, ephemeral: true }); }
        catch (error) { interaction.reply({ content: '❌ Hata.', ephemeral: true }); }
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
        const embed = new EmbedBuilder().setTitle('📢 SAHO CHEATS DUYURU').setDescription(mesaj).setColor(CONFIG.EMBED_COLOR).setFooter({ text: guild.name }).setTimestamp();
        await targetChannel.send({ content: '@everyone', embeds: [embed] });
        interaction.reply({ content: '✅', ephemeral: true });
    }

    // --- SUNUCU BİLGİ ---
    if (commandName === 'sunucu-bilgi') {
        const embed = new EmbedBuilder().setTitle(`📊 ${guild.name}`).addFields({ name: '👥 Üye', value: `${guild.memberCount}`, inline: true }).setColor(CONFIG.EMBED_COLOR);
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
        const embed = new EmbedBuilder().setTitle(`${emoji} DURUM BİLGİSİ`).addFields({ name: '📂 Yazılım', value: `**${urun}**`, inline: true }, { name: '📡 Durum', value: `\`${statusText}\``, inline: true }).setColor(color).setFooter({ text: 'SAHO CHEATS Status' });
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
        const embed = new EmbedBuilder().setTitle('🎡 SAHO CHEATS | ORANLAR').setDescription('💎 %0.5 External\n🔥 %1.5 Bypass\n👑 %3.0 Mod Menü\n🎫 %10 İndirim\n❌ %85 PAS').setColor('Gold');
        interaction.reply({ embeds: [embed] });
    }
    if (commandName === 'referans') {
        const puan = options.getInteger('puan');
        const yorum = options.getString('yorum');
        const stars = '⭐'.repeat(puan);
        const embed = new EmbedBuilder().setAuthor({ name: `${user.username} referans bıraktı!`, iconURL: user.displayAvatarURL() }).setDescription(`**Puan:** ${stars}\n**Yorum:** ${yorum}`).setColor('Gold');
        const vouchChannel = guild.channels.cache.find(c => c.name.includes('referans') || c.name.includes('vouch'));
        if (vouchChannel) { await vouchChannel.send({ embeds: [embed] }); interaction.reply({ content: '❤️', ephemeral: true }); }
        else interaction.reply({ content: 'Kanal bulunamadı.', ephemeral: true });
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
        for (const item of items) { if (random < item.chance) { selectedItem = item; break; } random -= item.chance; }

        let color = CONFIG.EMBED_COLOR;
        let description = "";
        let footerText = usedExtra ? `Ekstra hak kullanıldı. Kalan: ${extraRights}` : `${user.username} günlük hakkını kullandı`;

        if (selectedItem.type === 'legendary' || selectedItem.type === 'epic' || selectedItem.type === 'rare') { color = 'Gold'; description = `🎉 **TEBRİKLER! ÖDÜL KAZANDIN!**\n\nKazandığın: **${selectedItem.name}**\n\n*Hemen ticket aç ve bu ekranın görüntüsünü at!*`; } 
        else if (selectedItem.type === 'lose') { color = 'Red'; description = `📉 **Maalesef...**\n\nSonuç: **${selectedItem.name}**\n\n*Yarın tekrar gel veya hak satın al!*`; } 
        else { color = 'Blue'; description = `👍 **Fena Değil!**\n\nKazandığın: **${selectedItem.name}**\n*Ticket açıp indirimini kullanabilirsin.*`; }
        const embed = new EmbedBuilder().setTitle('🎡 SAHO CHEATS ÇARKIFELEK').setDescription(description).setColor(color).setFooter({ text: footerText });
        await interaction.editReply({ embeds: [embed] });
    }

    // --- LİSANS İŞLEMLERİ (FULL) ---
    if (['vip-ekle', 'kullanici-ekle', 'olustur', 'sil', 'hwid-hak-ekle', 'durdurma-hak-ekle'].includes(commandName)) {
        if (commandName === 'hwid-hak-ekle' || commandName === 'durdurma-hak-ekle') { await interaction.deferReply({ ephemeral: true }); const data = await firebaseRequest('get', ''); if (!data) return interaction.editReply('Veri yok.'); const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); const adet = options.getInteger('adet'); const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma'; const menu = new StringSelectMenuBuilder().setCustomId(`add_right_${type}_${adet}`).setPlaceholder('Key Seç...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('➕'))); interaction.editReply({ content: `👇 **${type.toUpperCase()} Ekle:**`, components: [new ActionRowBuilder().addComponents(menu)] }); return; }
        if (commandName === 'sil') { await interaction.deferReply({ ephemeral: true }); const data = await firebaseRequest('get', ''); if (!data) return interaction.editReply('Veri yok.'); const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25); const menu = new StringSelectMenuBuilder().setCustomId('delete_key').setPlaceholder('Sil...').addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️'))); interaction.editReply({ content: '🗑️ **Sil:**', components: [new ActionRowBuilder().addComponents(menu)] }); return; }
        if (commandName.includes('ekle')) { await interaction.deferReply({ ephemeral: true }); const target = options.getUser('kullanici'); const key = options.getString('key_ismi').toUpperCase(); const gun = options.getInteger('gun'); const isVip = commandName === 'vip-ekle'; const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${isVip ? 'VIP' : 'NORMAL'}`; await firebaseRequest('put', key, data); const payload = createPanelPayload(key, data.split(',')); sendLog(guild, `🚨 **LİSANS OLUŞTURULDU**\n**Yönetici:** ${user.tag}\n**Key:** ${key}`); interaction.editReply({ content: `✅ **${target.username}** tanımlandı.` }); try { await target.send({ content: `🎉 **Lisansınız Hazır!**`, embeds: payload.embeds, components: payload.components }); } catch (e) {} return; }
        if (commandName === 'olustur') { const gun = options.getInteger('gun'); let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase(); await firebaseRequest('put', key.toUpperCase(), `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`); interaction.reply({ content: `🔑 **Boş Key:** \`${key.toUpperCase()}\``, ephemeral: true }); }
    }
}

// =============================================================================
//                             8. BUTON HANDLER (GELİŞMİŞ TICKET)
// =============================================================================
async function handleButton(interaction) {
    const { customId, user, guild, channel } = interaction;

    // --- TICKET KAPATMA ---
    if (customId === 'close_ticket') {
        const modal = new EmbedBuilder().setDescription('🔒 **Ticket 5 saniye içinde kapatılıyor...**').setColor(CONFIG.ERROR_COLOR);
        interaction.reply({ embeds: [modal] });
        sendLog(guild, `📕 **TICKET KAPANDI**\n**Kapatan:** ${user.tag}\n**Kanal:** ${channel.name}`);
        setTimeout(() => channel.delete().catch(() => {}), 5000);
    }
    else if (customId === 'claim_ticket') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '⛔ Yetkisiz!', ephemeral: true });
        channel.send({ embeds: [new EmbedBuilder().setDescription(`✅ Bu talep **${user}** tarafından devralındı.`).setColor(CONFIG.SUCCESS_COLOR)] });
    }

    // --- LİSANS İŞLEMLERİ (DURDUR / SIFIRLA) ---
    if (['toggle', 'reset'].includes(customId)) {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        if (!result) return interaction.editReply('❌ Lisans yok.');
        
        let { key, parts } = result;
        while (parts.length < 8) parts.push("0");
        const isVIP = parts[7] === 'VIP';
        const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
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
        const category = values[0]; // cat_buy, cat_tech, cat_other

        // Bakım modu
        if (isMaintenanceEnabled && !await checkPermission(user.id)) return interaction.reply({ content: '🔒 Bakımdayız.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        
        // Kanal oluştur
        const ticketNum = await getNextTicketNumber();
        const typePrefix = category.split('_')[1]; // buy, tech, other
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

        // Kontrol Paneli Embedi
        const controlEmbed = new EmbedBuilder()
            .setTitle('👋 Hoş Geldiniz')
            .setDescription(`Sayın **${user}**,\n\nTalep kategoriniz: **${typePrefix.toUpperCase()}**\nYetkililerimiz en kısa sürede dönüş yapacaktır.`)
            .setColor(CONFIG.EMBED_COLOR);

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Kapat & Arşivle').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Yetkili: Sahiplen').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️')
        );

        // Satın Alım ise Ürün Menüsü de ekle
        if (category === 'cat_buy') {
            const productMenu = new StringSelectMenuBuilder().setCustomId('select_product').setPlaceholder('📦 Hangi ürünü almak istiyorsunuz?').addOptions(
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
        await interaction.reply({ embeds: [new EmbedBuilder().setTitle(title).setDescription(desc).setColor(CONFIG.SUCCESS_COLOR)], ephemeral: true });
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
        const embed = new EmbedBuilder().setTitle(title).setDescription(`${priceInfo}\n\n▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n💳 **SATIN ALMAK İÇİN:**\nLütfen bu kanala **IBAN** veya **PAPARA** yazarak ödeme bilgilerini isteyiniz.`).setColor(CONFIG.EMBED_COLOR).setThumbnail('https://cdn-icons-png.flaticon.com/512/2543/2543369.png');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    // --- LİSANS MENÜLERİ (SİL / HAK EKLE) ---
    if (interaction.customId === 'delete_key' || interaction.customId.startsWith('add_right_')) {
        if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: '⛔ Yetkisiz.', ephemeral: true });
        const key = interaction.values[0];
        if (interaction.customId === 'delete_key') { await interaction.deferUpdate(); await firebaseRequest('delete', key); interaction.editReply({ content: `✅ **${key}** silindi!`, components: [] }); } 
        else {
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
//                             10. CRASH ENGELLEYİCİ (ANTI-CRASH)
// =============================================================================
process.on('unhandledRejection', error => { 
    console.error('Beklenmeyen Hata:', error); 
    // Botun çökmesini engeller
});

client.login(process.env.TOKEN);
