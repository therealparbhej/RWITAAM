const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const net = require('net');
const crypto = require('crypto');

const app = express();
const MENU_ITEMS = [
    { id: 'espresso', name: 'Espresso', price: 3.5 },
    { id: 'cappuccino', name: 'Cappuccino', price: 4.5 },
    { id: 'cold-coffee', name: 'Cold Coffee', price: 5.25 },
    { id: 'masala-chai', name: 'Masala Chai', price: 3.25 },
    { id: 'fries', name: 'French Fries', price: 4.75 },
    { id: 'chicken-wrap', name: 'Chicken Wrap', price: 7.25 }
];

const orders = new Map();
const newsletterSubscribers = new Set();

// Function to find an available port
function findAvailablePort(startPort) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(startPort, (err) => {
            if (err) {
                server.close();
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                const port = server.address().port;
                server.close(() => {
                    resolve(port);
                });
            }
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                findAvailablePort(startPort + 1).then(resolve).catch(reject);
            } else {
                reject(err);
            }
        });
    });
}

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/services', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'rwitaam-backend',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/menu', (req, res) => {
    res.json({ items: MENU_ITEMS });
});

app.post('/api/newsletter', (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    newsletterSubscribers.add(email);
    return res.status(201).json({
        success: true,
        message: 'Subscribed successfully.',
        subscribers: newsletterSubscribers.size
    });
});

app.post('/api/orders', (req, res) => {
    const customerName = String(req.body.customerName || '').trim();
    const phone = String(req.body.phone || '').trim();
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!customerName || !phone || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'customerName, phone, and at least one item are required.'
        });
    }

    const normalizedItems = items.map((itemId) => MENU_ITEMS.find((item) => item.id === itemId)).filter(Boolean);
    if (normalizedItems.length !== items.length) {
        return res.status(400).json({ success: false, message: 'One or more menu items are invalid.' });
    }

    const total = normalizedItems.reduce((sum, item) => sum + item.price, 0);
    const orderId = `ORD-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const order = {
        orderId,
        customerName,
        phone,
        items: normalizedItems,
        total,
        createdAt: new Date().toISOString(),
        status: 'received'
    };

    orders.set(orderId, order);
    return res.status(201).json({ success: true, order });
});

app.get('/api/orders/:orderId', (req, res) => {
    const order = orders.get(req.params.orderId);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, order });
});

// Contact form handler
app.post('/contact', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const message = String(req.body.message || '').trim();

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: 'Name, email, and message are required.'
        });
    }
    
    try {
        // Create transporter (configure with your email service)
        const transporter = nodemailer.createTransporter({
            service: 'gmail', // or your preferred email service
            auth: {
                user: process.env.EMAIL_USER || 'your-email@gmail.com',
                pass: process.env.EMAIL_PASS || 'your-app-password'
            }
        });

        // Email options
        const mailOptions = {
            from: email,
            to: process.env.CONTACT_EMAIL || 'cafe@example.com',
            subject: `New Contact Form Message from ${name}`,
            html: `
                <h3>New Contact Form Submission</h3>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        return res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
    }
});

// Start server with dynamic port finding
async function startServer() {
    try {
        const PORT = process.env.PORT || await findAvailablePort(3000);
        
        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Visit: http://localhost:${PORT}`);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
