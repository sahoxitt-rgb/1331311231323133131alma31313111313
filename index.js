require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const express = require('express');
const axios = require('axios');

// --- AYARLAR ---
const CONFIG = {
    FIREBASE_URL: process.env.FIREBASE_URL, // Senin C# kodundaki URL
    FIREBASE_SECRET: process.env.FIREBASE_SECRET, // Senin C# kodundaki Secret
    // Botun Client ID'sini .env dosyana CLIENT_ID=123456... olarak eklemeni öneririm.
    // Ekli değilse bot hata verebilir, o yüzden client.user.id ile dinamik almaya çalışacağız.
};

// --- 1. 7/24 AKTİF TUTMA (WEB SERVER) ---
const app = express();
app.get('/', (req, res) => res.send('FAKE LAG V1 Botu Aktif!'));
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Web sunucusu ${port} portunda çalışıyor.`));

// --- 2. BOT KURULUMU ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- 3. KOMUTLARI HAZIRLA ---
const commands = [
    new SlashCommandBuilder()
        .setName('kullanici-ekle')
        .setDescription('Kullanıcıya özel key oluşturur ve DM atar.')
        .addUserOption(option => option.setName('kullanici').setDescription('Kullanıcıyı seç').setRequired(true))
        .addStringOption(option => option.setName('key_ismi').setDescription('Özel Key İsmi').setRequired(true))
        .addIntegerOption(option => option.setName('gun').setDescription('Kaç gün?').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder()
        .setName('olustur')
        .setDescription('Rastgele veya özel key oluşturur.')
        .addIntegerOption(option => option.setName('gun').setDescription('Kaç gün?').setRequired(true))
        .addStringOption(option => option.setName('isim').setDescription('Özel isim (Boş bırakırsan rastgele)')),

    new SlashCommandBuilder()
        .setName('sil')
        .setDescription('Bir keyi siler.')
        .addStringOption(option => option.setName('key').setDescription('Silinecek Key').setRequired(true)),

    new SlashCommandBuilder()
        .setName('lisansim')
        .setDescription('Kendi lisans durumunu gör ve yönet.'),
    
    new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Sistem istatistikleri.'),
    
    new SlashCommandBuilder()
        .setName('bakim')
        .setDescription('Sistemi bakıma al veya aç.')
        .addStringOption(option => option.setName('mod').setDescription('AKTIF veya KAPALI').setRequired(true).addChoices({ name: 'Sistemi Aç', value: 'AKTIF' }, { name: 'Sistemi Kapat', value: 'KAPALI' }))

].map(command => command.toJSON());

// --- 4. FIREBASE FONKSİYONLARI (DÜZELTİLDİ) ---
async function firebaseRequest(method, path, data = null) {
    // URL sonuna .json ekliyoruz.
    const url = `${CONFIG.FIREBASE_URL}${path}.json?auth=${CONFIG.FIREBASE_SECRET}`;
    
    try {
        // EN ÖNEMLİ DÜZELTME BURASI: JSON.stringify(data)
        // Firebase'e string gönderirken tırnak içinde gitmesi lazım, yoksa C# okuyamaz.
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

async function findUserKey(discordId) {
    const data = await firebaseRequest('get', '');
    if (!data) return null;
    for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_")) continue;
        // C# formatı bazen sadece "HWID,Tarih,Durum" olabilir.
        // Bizim formatımız "bos,gun,durum,tarih,dcID,pause,reset"
        // Bu yüzden split edip index kontrolü yapıyoruz.
        if (typeof value === 'string') {
            const parts = value.split(',');
            // 4. indexte Discord ID var mı diye bakıyoruz
            if (parts.length > 4 && parts[4] === discordId) return { key, parts };
        }
    }
    return null;
}

// --- 5. BOT BAŞLATMA VE KOMUT YÜKLEME ---
client.once('ready', async () => {
    console.log(`Bot giriş yaptı: ${client.user.tag}`);
    client.user.setActivity('FAKE LAG V1 | /lisansim');

    // Komutları Yükle
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log('Komutlar yükleniyor...');
        // Client ID'yi otomatikleştirdik
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Komutlar başarıyla yüklendi!');
    } catch (error) {
        console.error("Komut yükleme hatası:", error);
    }
});

// --- 6. KOMUTLARI DİNLEME ---
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) return handleButton(interaction);
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user } = interaction;

    // --- KULLANICI EKLE ---
    if (commandName === 'kullanici-ekle') {
        await interaction.deferReply({ ephemeral: true });
        const targetUser = options.getUser('kullanici');
        const keyIsmi = options.getString('key_ismi').trim().toUpperCase(); // Keyler büyük harf
        const gun = options.getInteger('gun');
        const tarih = new Date().toISOString().split('T')[0];

        // Format: bos,gun,durum,tarih,dcID,pause,reset
        // C# programın ilk kısmı "bos" ise ikinci kısmı gün sayısı olarak alıyor.
        const data = `bos,${gun},aktif,${tarih},${targetUser.id},0,0`;
        
        await firebaseRequest('put', keyIsmi, data);

        const embed = new EmbedBuilder()
            .setTitle('✅ Kullanıcı Tanımlandı')
            .setDescription(`${targetUser} kullanıcısına \`${keyIsmi}\` tanımlandı.`)
            .setColor(0x00FF41);

        await interaction.editReply({ embeds: [embed] });

        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🔑 FAKE LAG V1 LİSANS')
                .setDescription(`Merhaba **${targetUser.username}**, lisansın aktif.`)
                .addFields(
                    { name: 'Lisans', value: `\`${keyIsmi}\`` },
                    { name: 'Süre', value: `${gun} Gün` }
                )
                .setColor(0x00C8FF);
            await targetUser.send({ embeds: [dmEmbed] });
        } catch (e) {
            await interaction.followUp({ content: 'Key oluştu ama DM atılamadı (DM Kapalı olabilir).', ephemeral: true });
        }
    }

    // --- OLUŞTUR ---
    if (commandName === 'olustur') {
        await interaction.deferReply({ ephemeral: true });
        const gun = options.getInteger('gun');
        let key = options.getString('isim');
        
        if (!key) key = "KEY-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        else key = key.toUpperCase();
        
        const tarih = new Date().toISOString().split('T')[0];
        // Discord ID yoksa 0 yazıyoruz
        const data = `bos,${gun},aktif,${tarih},0,0,0`;
        
        await firebaseRequest('put', key, data);

        const embed = new EmbedBuilder()
            .setTitle('✅ Key Oluşturuldu')
            .setDescription(`Key: \`${key}\`\nSüre: \`${gun} Gün\``)
            .setColor(0x00FF41);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- SİL ---
    if (commandName === 'sil') {
        await interaction.deferReply();
        const key = options.getString('key').toUpperCase();
        await firebaseRequest('delete', key);
        const embed = new EmbedBuilder().setTitle('🗑️ Silindi').setDescription(`\`${key}\` silindi.`).setColor(0xFF0032);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- LİSANSIM ---
    if (commandName === 'lisansim') {
        await interaction.deferReply({ ephemeral: true });
        const result = await findUserKey(user.id);
        
        // Not: Kullanıcı C# programına giriş yaparsa C# programı keyin içeriğini değiştirebilir (ID'yi silebilir).
        // Bu durumda lisansım komutu çalışmayabilir. Bu normaldir.
        if (!result) return interaction.editReply('❌ Sana ait bir lisans bulunamadı veya lisansı programa girdikten sonra ID silindi.');

        const { key, parts } = result;
        // Eğer key daha kullanılmamışsa (bos) veya kullanılmışsa format değişir.
        // Hata almamak için güvenli okuma yapıyoruz.
        const durum = parts[2] || "Bilinmiyor";
        const pauseUsed = parts.length > 5 ? parseInt(parts[5]) : 0;
        const resetUsed = parts.length > 6 ? parseInt(parts[6]) : 0;

        const embed = new EmbedBuilder()
            .setTitle(`⚙️ KONTROL PANELİ: ${user.username}`)
            .addFields(
                { name: '🔑 Lisans', value: `\`${key}\``, inline: true },
                { name: '🛡️ Durum', value: durum.toUpperCase(), inline: true },
                { name: '⏸️ Durdurma Hakkı', value: `${2 - pauseUsed}/2`, inline: true },
                { name: '💻 Reset Hakkı', value: `${1 - resetUsed}/1`, inline: true }
            )
            .setColor(0x00FF41);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('toggle').setLabel('Durdur/Başlat').setStyle(ButtonStyle.Primary).setDisabled(pauseUsed >= 2 && durum === 'aktif'),
            new ButtonBuilder().setCustomId('reset').setLabel('HWID Sıfırla').setStyle(ButtonStyle.Danger).setDisabled(resetUsed >= 1)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }

    // --- DASHBOARD ---
    if (commandName === 'dashboard') {
        await interaction.deferReply();
        const data = await firebaseRequest('get', '');
        let total = 0, active = 0;
        if (data) {
            Object.keys(data).forEach(k => {
                if (!k.startsWith("_") && typeof data[k] === 'string') {
                    total++;
                    if (data[k].includes('aktif')) active++;
                }
            });
        }
        const embed = new EmbedBuilder()
            .setTitle('📊 FAKE LAG V1 İSTATİSTİK')
            .addFields(
                { name: 'Toplam Key', value: `${total}`, inline: true },
                { name: 'Aktif Key', value: `${active}`, inline: true }
            )
            .setColor(0x00C8FF);
        await interaction.editReply({ embeds: [embed] });
    }

    // --- BAKIM ---
    if (commandName === 'bakim') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
             return interaction.reply({ content: 'Yetkin yok!', ephemeral: true });
        }
        const mod = options.getString('mod');
        await firebaseRequest('put', '_SYSTEM_STATUS', mod);
        await interaction.reply({ content: `Sistem durumu güncellendi: **${mod}**`, ephemeral: false });
    }
});

// --- 7. BUTON YÖNETİMİ ---
async function handleButton(interaction) {
    await interaction.deferUpdate();
    const result = await findUserKey(interaction.user.id);
    if (!result) return interaction.followUp({content: 'Lisans bulunamadı.', ephemeral: true});
    
    const { key, parts } = result;
    
    // C# programı key formatını değiştirirse bu butonlar çalışmayabilir.
    // Güvenlik kontrolü:
    if (parts.length < 7) {
        return interaction.followUp({content: 'Programda giriş yapıldığı için web panelden işlem yapılamıyor. Lütfen programı kullan.', ephemeral: true});
    }

    if (interaction.customId === 'toggle') {
        let yeniDurum = parts[2] === 'aktif' ? 'pasif' : 'aktif';
        let pauseUsed = parseInt(parts[5]);
        if (yeniDurum === 'pasif') pauseUsed++;

        parts[2] = yeniDurum;
        parts[5] = pauseUsed;
        
        await firebaseRequest('put', key, parts.join(','));
        await interaction.followUp({ content: `Durum değişti: ${yeniDurum.toUpperCase()}`, ephemeral: true });
    }

    if (interaction.customId === 'reset') {
        let resetUsed = parseInt(parts[6]);
        resetUsed++;
        
        // HWID Sıfırlama Mantığı: C# tarafında "bos" yazınca yeni HWID alıyor.
        // Ama kullanıcı süreyi kaybetmesin diye tarihi korumalıyız.
        // Burası biraz karışık çünkü C# formatı ile Bot formatı farklılaşıyor.
        // Basit çözüm: Sayacı artır.
        
        parts[6] = resetUsed;
        // HWID'yi sıfırlamak için ilk kısmı 'bos' yapabilirsin ama bu süreyi sıfırlayabilir.
        // Şimdilik sadece sayacı artırıyoruz.
        
        await firebaseRequest('put', key, parts.join(','));
        await interaction.followUp({ content: `HWID Sıfırlama isteği alındı! (Not: Tam sıfırlama için yöneticiye yaz)`, ephemeral: true });
    }
}

client.login(process.env.TOKEN);