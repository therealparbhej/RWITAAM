const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const net = require('net');

const app = express();

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

// Contact form handler
app.post('/contact', async (req, res) => {
    const { name, email, message } = req.body;
    
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
        
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.json({ success: false, message: 'Failed to send message. Please try again.' });
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