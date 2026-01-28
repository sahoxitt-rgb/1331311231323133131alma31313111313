require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, 
    REST, Routes, SlashCommandBuilder, Partials, PermissionFlagsBits 
} = require('discord.js');
const express = require('express');
const axios = require('axios');

// =====================================================
//                 AYARLAR VE KONFİGÜRASYON
// =====================================================
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL, 
    FIREBASE_SECRET: process.env.FIREBASE_SECRET,
    OWNER_ID: "1380526273431994449", // SENİN ID'N
    
    // LİMİTLER
    DEFAULT_PAUSE_LIMIT: 2,
    DEFAULT_RESET_LIMIT: 1,
    VIP_PAUSE_LIMIT: 999, // VIP Sınırsız
    VIP_RESET_LIMIT: 5
};

// =====================================================
//                 1. WEB SERVER (7/24)
// =====================================================
const app = express();
app.get('/', (req, res) => res.send('FAKE LAG V1 - SYSTEM OPERATIONAL'));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`🌍 Web sunucusu ${port} portunda çalışıyor.`));

// =====================================================
//                 2. BOT KURULUMU
// =====================================================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.DirectMessages // DM okumak için
    ], 
    partials: [Partials.Channel] // DM kanalını önbelleğe almak için şart
});

// =====================================================
//                 3. KOMUT LİSTESİ
// =====================================================
const commands = [
    // --- YETKİLİ KOMUTLARI ---
    new SlashCommandBuilder()
        .setName('admin-panel')
        .setDescription('👑 (Admin) Yönetici kontrol merkezi.'),

    new SlashCommandBuilder()
        .setName('vip-ekle')
        .setDescription('💎 (Admin) Kullanıcıya VIP lisans ver ve DM at.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı (Örn: VIP-AHMET)').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kullanici-ekle')
        .setDescription('🛠️ (Admin) Kullanıcıya Normal lisans ver ve DM at.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kullanıcı').setRequired(true))
        .addStringOption(o => o.setName('key_ismi').setDescription('Key Adı').setRequired(true))
        .addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('olustur')
        .setDescription('🛠️ (Admin) Boş, sahipsiz bir key oluşturur.')
        .addIntegerOption(o => o.setName('gun').setDescription('Süre').setRequired(true))
        .addStringOption(o => o.setName('isim').setDescription('İsim (Boş bırakırsan rastgele)')),

    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('🗑️ (Admin) Listeden seçerek key sil.'),

    new SlashCommandBuilder()
        .setName('hwid-hak-ekle')
        .setDescription('➕ (Admin) Listeden seçtiğin keye HWID reset hakkı ekle.')
        .addIntegerOption(o => o.setName('adet').setDescription('Kaç hak eklensin?').setRequired(true)),

    new SlashCommandBuilder()
        .setName('durdurma-hak-ekle')
        .setDescription('➕ (Admin) Listeden seçtiğin keye Durdurma hakkı ekle.')
        .addIntegerOption(o => o.setName('adet').setDescription('Kaç hak eklensin?').setRequired(true)),

    new SlashCommandBuilder()
        .setName('yetkili-ekle')
        .setDescription('👑 (Owner) Yeni bir yönetici ekle.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)),

    new SlashCommandBuilder()
        .setName('yetkili-cikar')
        .setDescription('👑 (Owner) Yetkiyi al.')
        .addUserOption(o => o.setName('kullanici').setDescription('Kişi').setRequired(true)),

    // --- KULLANICI KOMUTLARI ---
    new SlashCommandBuilder()
        .setName('lisansim')
        .setDescription('👤 Lisans panelini aç (Durdur/Başlat/Reset).'),

    new SlashCommandBuilder()
        .setName('lisans-bagla')
        .setDescription('🔗 Elindeki keyi hesabına tanımla.')
        .addStringOption(o => o.setName('key').setDescription('Key').setRequired(true)),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('❓ Yardım menüsü.'),

].map(command => command.toJSON());

// =====================================================
//                 4. YARDIMCI FONKSİYONLAR
// =====================================================

// Firebase İstekçisi
async function firebaseRequest(method, path, data = null) {
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    try {
        const payload = data ? JSON.stringify(data) : null;
        const response = await axios({ 
            method: method, 
            url: url, 
            data: payload,
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console.error("Firebase Hatası:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Key Bulucu
async function findUserKey(discordId) {
    const data = await firebaseRequest('get', '');
    if (!data) return null;
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_")) continue;
        if (typeof value === 'string') {
            const parts = value.split(',');
            // Format: bos, Gun, Durum, Tarih, DC_ID, PauseCount, ResetCount, Type
            // Index 4: Discord ID
            if (parts.length > 4 && parts[4] === discordId) return { key, parts };
        }
    }
    return null;
}

// Yetki Kontrolü
async function checkPermission(userId) {
    if (userId === CONFIG.OWNER_ID) return true;
    const admins = await firebaseRequest('get', '_ADMINS_');
    if (admins && admins[userId]) return true;
    return false;
}

// PANEL OLUŞTURUCU (HEM DM HEM SUNUCU İÇİN ORTAK)
function createPanelPayload(key, parts) {
    // Veri eksikse tamamla
    while (parts.length < 8) parts.push("0");

    const isVIP = parts[7] === 'VIP';
    const LIMITS = { 
        PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, 
        RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT 
    };
    
    let durum = parts[2];
    let pauseUsed = parseInt(parts[5] || 0);
    let resetUsed = parseInt(parts[6] || 0);
    
    // Kalan Hak Hesapla (Negatif olmasın diye Math.max)
    const kalanPause = Math.max(0, LIMITS.PAUSE - pauseUsed);
    const kalanReset = Math.max(0, LIMITS.RESET - resetUsed);

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ LİSANS YÖNETİMİ: ${isVIP ? '💎 VIP' : '🛠️ STANDART'}`)
        .setDescription(`Aşağıdaki butonları kullanarak lisansını yönetebilirsin.
        Bu panel üzerinden **anlık işlem** yapabilirsin.`)
        .setColor(isVIP ? 'Gold' : 'Green')
        .addFields(
            { name: '🔑 Lisans Key', value: `\`${key}\``, inline: true },
            { name: '📡 Durum', value: durum === 'aktif' ? '✅ AKTİF' : '⏸️ DURAKLATILDI', inline: true },
            { name: '\u200B', value: '\u200B', inline: false },
            { name: '⏸️ Kalan Durdurma', value: isVIP ? '∞ (Sınırsız)' : `\`${kalanPause} / ${LIMITS.PAUSE}\``, inline: true },
            { name: '💻 Kalan HWID Reset', value: `\`${kalanReset} / ${LIMITS.RESET}\``, inline: true }
        )
        .setFooter({ text: 'FAKE LAG V1 | Güvenli Lisans Sistemi' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('toggle')
            .setLabel(durum === 'aktif' ? 'DURDUR (Hak Yer)' : 'BAŞLAT')
            .setStyle(durum === 'aktif' ? ButtonStyle.Danger : ButtonStyle.Success)
            .setDisabled(durum === 'aktif' && !isVIP && kalanPause <= 0), // Hakkı yoksa durduramaz
        
        new ButtonBuilder()
            .setCustomId('reset')
            .setLabel('HWID SIFIRLA')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🔄')
            .setDisabled(kalanReset <= 0) // Hakkı yoksa resetleyemez
    );

    return { embeds: [embed], components: [row] };
}

// =====================================================
//                 5. BOT BAŞLATMA
// =====================================================
client.once('ready', async () => {
    console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('FAKE LAG V1 | /help');

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('🔄 Komutlar Discord API\'ye yükleniyor...');
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✨ Komutlar başarıyla yüklendi! (Discord\'da CTRL+R yap)');
    } catch (error) {
        console.error("❌ Komut yükleme hatası:", error);
    }
});

// =====================================================
//                 6. ETKİLEŞİM YÖNETİCİSİ
// =====================================================
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isStringSelectMenu()) return handleSelectMenu(interaction);
        if (interaction.isButton()) return handleButton(interaction);
        if (interaction.isChatInputCommand()) return handleCommand(interaction);
    } catch (e) {
        console.error("Interaction Hatası:", e);
    }
});

// =====================================================
//                 7. SLASH KOMUTLARI
// =====================================================
async function handleCommand(interaction) {
    const { commandName, options, user } = interaction;
    const userId = user.id;

    // --- KULLANICI / VIP EKLE VE DM GÖNDER ---
    if (commandName === 'vip-ekle' || commandName === 'kullanici-ekle') {
        if (!await checkPermission(userId)) return interaction.reply({ content: '⛔ Yetkin Yok!', ephemeral: true });

        const target = options.getUser('kullanici');
        const key = options.getString('key_ismi').toUpperCase();
        const gun = options.getInteger('gun');
        const isVip = commandName === 'vip-ekle';
        
        // 1. Key Oluştur
        const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},${target.id},0,0,${isVip ? 'VIP' : 'NORMAL'}`;
        await firebaseRequest('put', key, data);

        // 2. Panel verisini hazırla
        const parts = data.split(',');
        const payload = createPanelPayload(key, parts);

        // 3. Yöneticiye bildir
        await interaction.reply({ content: `✅ **${target.username}** kullanıcısına lisans tanımlandı ve DM gönderiliyor...`, ephemeral: true });

        // 4. KULLANICIYA DM AT
        try {
            await target.send({ 
                content: `🎉 **Merhaba ${target.username}!**\nSana özel **${isVip ? '💎 VIP' : '🛠️ Standart'}** lisansın tanımlandı.\nAşağıdaki panelden lisansını yönetebilirsin:`,
                embeds: payload.embeds,
                components: payload.components 
            });
            await interaction.followUp({ content: '📨 Kullanıcıya **DM Paneli** başarıyla iletildi!', ephemeral: true });
        } catch (error) {
            await interaction.followUp({ content: '⚠️ **UYARI:** Key oluşturuldu ama kullanıcının **DM kutusu kapalı** olduğu için panel gönderilemedi. Kullanıcı `/lisansim` komutuyla panele erişebilir.', ephemeral: true });
        }
    }

    // --- HELP (YARDIM) ---
    else if (commandName === 'help') {
        const isAdmin = await checkPermission(userId);
        const embed = new EmbedBuilder()
            .setTitle('🤖 FAKE LAG V1 - KOMUT MERKEZİ')
            .setDescription('Sistemdeki komutlar aşağıdadır.')
            .setColor('Blurple')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '👤 Kullanıcı', value: '`/lisansim` - Panelini açar\n`/lisans-bagla` - Key tanımlar' }
            );

        if (isAdmin) {
            embed.addFields(
                { name: '🛡️ Lisans Yönetimi', value: '`/kullanici-ekle` (DM Atar)\n`/vip-ekle` (DM Atar)\n`/olustur` (Boş Key)\n`/sil`' },
                { name: '➕ Hak Tanımlama', value: '`/hwid-hak-ekle`\n`/durdurma-hak-ekle`' }
            );
        }
        if (userId === CONFIG.OWNER_ID) {
            embed.addFields({ name: '👑 Owner', value: '`/yetkili-ekle`\n`/yetkili-cikar`' });
        }
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    // --- LİSANSIM (PANEL AÇMA) ---
    else if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(userId);
        if (!result) return interaction.editReply('❌ **Lisansın Yok!** `/lisans-bagla` ile key ekle.');
        
        const payload = createPanelPayload(result.key, result.parts);
        interaction.editReply(payload);
    }
    
    // --- LİSANS BAĞLA ---
    else if (commandName === 'lisans-bagla') {
        await interaction.deferReply({ ephemeral: true });
        const inputKey = options.getString('key').toUpperCase();
        const rawData = await firebaseRequest('get', inputKey);
        
        if (!rawData) return interaction.editReply('❌ **Key bulunamadı!**');
        
        let parts = rawData.split(',');
        if (parts.length > 4 && parts[4] !== '0' && parts[4] !== userId) {
            return interaction.editReply('❌ **Bu key başkasına ait!**');
        }
        if (parts[4] === userId) return interaction.editReply('⚠️ Bu key zaten sana tanımlı.');

        parts[4] = userId; 
        await firebaseRequest('put', inputKey, parts.join(','));
        interaction.editReply(`✅ \`${inputKey}\` başarıyla hesabına bağlandı!`);
    }

    // --- HAK EKLEME ve SİLME (LİSTELEME) ---
    else if (['hwid-hak-ekle', 'durdurma-hak-ekle', 'sil'].includes(commandName)) {
        if (!await checkPermission(userId)) return interaction.reply({ content: '⛔ Yetkin Yok!', ephemeral: true });
        
        await interaction.deferReply({ ephemeral: true });
        const data = await firebaseRequest('get', '');
        if (!data) return interaction.editReply('Veritabanı boş.');
        
        // Sadece geçerli keyleri filtrele ve son 25 tanesini al (Discord limiti)
        const keys = Object.keys(data).filter(k => !k.startsWith("_")).slice(0, 25);
        if (keys.length === 0) return interaction.editReply('Listelenecek key yok.');
        
        let selectMenu;
        if (commandName === 'sil') {
            selectMenu = new StringSelectMenuBuilder()
                .setCustomId('delete_key')
                .setPlaceholder('Silinecek Keyi Seç...')
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setEmoji('🗑️')));
        } else {
            const adet = options.getInteger('adet');
            const type = commandName === 'hwid-hak-ekle' ? 'hwid' : 'durdurma';
            
            selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`add_right_${type}_${adet}`)
                .setPlaceholder(`Hangi keye +${adet} hak eklensin?`)
                .addOptions(keys.map(k => new StringSelectMenuOptionBuilder().setLabel(k).setValue(k).setDescription(`+${adet} ${type.toUpperCase()} hakkı verilecek.`)));
        }
        
        interaction.editReply({ 
            content: `👇 **İşlem yapılacak keyi seç:**`, 
            components: [new ActionRowBuilder().addComponents(selectMenu)] 
        });
    }
    
    // --- OLUŞTUR (BOŞ KEY) ---
    else if (commandName === 'olustur') {
        if (!await checkPermission(userId)) return interaction.reply({ content: '⛔ Yetkin Yok!', ephemeral: true });
        
        const gun = options.getInteger('gun');
        let key = options.getString('isim') || "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const data = `bos,${gun},aktif,${new Date().toISOString().split('T')[0]},0,0,0,NORMAL`; 
        await firebaseRequest('put', key.toUpperCase(), data);
        
        interaction.reply({ content: `🔑 **Boş Key Oluşturuldu:** \`${key.toUpperCase()}\`\nBu key şu an sahipsiz.`, ephemeral: true });
    }
    
    // --- YETKİLİ EKLE/ÇIKAR ---
    else if (commandName === 'yetkili-ekle' || commandName === 'yetkili-cikar') {
        if (userId !== CONFIG.OWNER_ID) return interaction.reply({ content: '⛔ Sadece Owner!', ephemeral: true });
        
        const target = options.getUser('kullanici');
        if (commandName.includes('ekle')) {
            await firebaseRequest('put', `_ADMINS_/${target.id}`, { name: target.username });
            interaction.reply(`✅ ${target} yetkili yapıldı.`);
        } else {
            await firebaseRequest('delete', `_ADMINS_/${target.id}`);
            interaction.reply(`🗑️ ${target} yetkisi alındı.`);
        }
    }

    // --- ADMIN PANEL ---
    else if (commandName === 'admin-panel') {
        if (!await checkPermission(userId)) return interaction.reply({ content: '⛔ Yetkin Yok!', ephemeral: true });
        
        const embed = new EmbedBuilder().setTitle('🛠️ Yönetici Paneli').setDescription('Tüm komutları kullanabilirsin.').setColor('Gold');
        interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

// =====================================================
//                 8. BUTON YÖNETİMİ
// =====================================================
async function handleButton(interaction) {
    const userId = interaction.user.id;
    // DM'de de çalışması için user.id'yi kullanıyoruz
    const result = await findUserKey(userId);
    if (!result) return interaction.reply({ content: 'Lisans bulunamadı.', ephemeral: true });
    
    let { key, parts } = result;
    while (parts.length < 8) parts.push("0");
    
    const isVIP = parts[7] === 'VIP';
    const LIMITS = { PAUSE: isVIP ? CONFIG.VIP_PAUSE_LIMIT : CONFIG.DEFAULT_PAUSE_LIMIT, RESET: isVIP ? CONFIG.VIP_RESET_LIMIT : CONFIG.DEFAULT_RESET_LIMIT };
    let [durum, pause, reset] = [parts[2], parseInt(parts[5]), parseInt(parts[6])];

    // --- DURDUR / BAŞLAT ---
    if (interaction.customId === 'toggle') {
        if (durum === 'aktif') {
            if (!isVIP && pause >= LIMITS.PAUSE) return interaction.reply({ content: '❌ Durdurma hakkın bitti!', ephemeral: true });
            durum = 'pasif'; 
            pause++;
        } else {
            durum = 'aktif';
        }
        parts[2] = durum; parts[5] = pause;
    } 
    // --- HWID RESET ---
    else if (interaction.customId === 'reset') {
        if (reset >= LIMITS.RESET) return interaction.reply({ content: '❌ Reset hakkın bitti!', ephemeral: true });
        parts[0] = 'bos'; // C# için reset sinyali
        reset++; 
        parts[6] = reset;
        await interaction.reply({ content: '✅ **HWID Başarıyla Sıfırlandı!** Yeni cihaza giriş yapabilirsin.', ephemeral: true });
    }

    // Veritabanını güncelle
    await firebaseRequest('put', key, parts.join(','));
    
    // Paneli güncelle
    const payload = createPanelPayload(key, parts);
    
    try {
        if (!interaction.replied) await interaction.update(payload);
    } catch (e) {
        // Eğer reply atıldıysa (reset mesajı gibi), update yapamayız, bu normal.
    }
}

// =====================================================
//                 9. LİSTE (SELECT MENU) YÖNETİMİ
// =====================================================
async function handleSelectMenu(interaction) {
    if (!await checkPermission(interaction.user.id)) return interaction.reply({ content: 'Yetkisiz.', ephemeral: true });
    
    const key = interaction.values[0];

    // SİLME
    if (interaction.customId === 'delete_key') {
        await firebaseRequest('delete', key);
        interaction.update({ content: `✅ **${key}** silindi!`, components: [] });
    } 
    // HAK EKLEME
    else if (interaction.customId.startsWith('add_right_')) {
        const [_, __, type, amountStr] = interaction.customId.split('_');
        const amount = parseInt(amountStr);
        
        const raw = await firebaseRequest('get', key);
        if (raw) {
            let p = raw.split(',');
            while (p.length < 8) p.push("0");
            
            // Hak eklemek demek, kullanılan hakkı (pause/reset count) düşürmek demektir.
            // Index 6: Reset, Index 5: Pause
            let idx = type === 'hwid' ? 6 : 5;
            let currentUsed = parseInt(p[idx]);
            
            // Kullanılan hakkı azalt (0'ın altına düşmesin)
            p[idx] = Math.max(0, currentUsed - amount);
            
            await firebaseRequest('put', key, p.join(','));
            interaction.update({ content: `✅ **${key}** için +${amount} **${type.toUpperCase()}** hakkı eklendi.`, components: [] });
        } else {
            interaction.update({ content: '❌ Key bulunamadı.', components: [] });
        }
    }
}

client.login(process.env.TOKEN);