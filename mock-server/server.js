const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });


app.use(cors());
app.use(express.json());

// Mock database for contacts
let contacts = [];

app.post('/predict', upload.single('audio'), (req, res) => {
    console.log('Received audio for prediction...');

    // Simulate processing time
    setTimeout(() => {
        // Randomly return threat detected (30% chance) or safe (70% chance)
        // Or strictly strictly alternate for testing? Let's do random for now as requested.
        // User said: "randomly"
        const isThreat = Math.random() < 0.3;

        console.log(`Prediction result: ${isThreat ? 'THREAT DETECTED' : 'SAFE'}`);

        res.json({
            threat: isThreat,
            confidence: Math.random(),
            details: isThreat ? "Screaming detected" : "Normal background noise"
        });
    }, 2000);
});

app.post('/contacts', (req, res) => {
    console.log('Received contacts update:', req.body);
    contacts = req.body.contacts;
    res.json({ success: true, message: "Contacts saved successfully" });
});

app.get('/contacts', (req, res) => {
    res.json({ contacts });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Mock server running on http://localhost:${PORT}`);
});
