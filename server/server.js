const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 9001;

// Data file path
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'messages.json');

// Helper functions for JSON file storage
function readMessages() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading messages:', error);
    }
    return [];
}

function writeMessages(messages) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing messages:', error);
        return false;
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// API Routes

// Get all messages
app.get('/api/messages', (req, res) => {
    try {
        const messages = readMessages();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Submit a new message
app.post('/api/messages', (req, res) => {
    const { name, message } = req.body;

    if (!name || !message) {
        return res.status(400).json({ error: 'Name and message are required' });
    }

    try {
        const messages = readMessages();
        const newMessage = {
            id: Date.now(),
            name: name.trim(),
            message: message.trim(),
            created_at: new Date().toISOString()
        };
        messages.unshift(newMessage); // Add to beginning (newest first)
        writeMessages(messages);

        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Delete a message (admin)
app.delete('/api/messages/:id', (req, res) => {
    const { id } = req.params;

    try {
        let messages = readMessages();
        messages = messages.filter(m => m.id !== parseInt(id));
        writeMessages(messages);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Delete all messages (admin)
app.delete('/api/messages', (req, res) => {
    try {
        writeMessages([]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear messages' });
    }
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
    try {
        const messages = readMessages();
        res.json({ totalMessages: messages.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
