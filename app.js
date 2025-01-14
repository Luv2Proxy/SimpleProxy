const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { Buffer } = require('buffer');
const Alloy = require('alloyproxy');
const os = require('os');

const app = express();
const server = http.createServer(app);

app.use(bodyParser.json());

// Initialize AlloyProxy
const Unblocker = new Alloy({
    prefix: '/fetch/',
    request: [],
    response: [],
    injection: true,
});
app.use(Unblocker.app);

app.get('/', (req, res) => {
    const clientPage = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proxy with AES Encryption</title>
        <style>
            :root {
                --bg-color: #ffffff;
                --text-color: #000000;
                --button-bg: #4CAF50;
                --button-text: #ffffff;
            }
            body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
                background-color: var(--bg-color);
                color: var(--text-color);
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            input, button {
                padding: 10px;
                margin: 10px;
                width: 80%;
            }
            button {
                width: auto;
                background-color: var(--button-bg);
                color: var(--button-text);
                border: none;
                cursor: pointer;
            }
            button:hover {
                background-color: #45a049;
            }
            .dark-mode-toggle {
                margin-top: 20px;
                padding: 10px 20px;
                background-color: var(--button-bg);
                color: var(--button-text);
                border: none;
                cursor: pointer;
                border-radius: 5px;
            }
        </style>
    </head>
    <body>
        <h1>Node.js Proxy Frontend</h1>
        <input type="text" id="urlInput" placeholder="Enter website URL (e.g., https://example.com)" />
        <input type="text" id="titleInput" placeholder="Enter custom title for the page" />
        <button onclick="unblock(document.getElementById('urlInput').value)">Unblock</button>
        <button class="dark-mode-toggle" onclick="toggleDarkMode()">Toggle Dark Mode</button>
        <br>
        <br>
        <h2>Quick Links:</h2>
        <button onclick="unblock('https://1v1.lol')">1v1.lol</button>
        <script>
            function toggleDarkMode() {
                const root = document.documentElement;
                const isDarkMode = root.style.getPropertyValue('--bg-color') === '#333333';
                if (isDarkMode) {
                    root.style.setProperty('--bg-color', '#ffffff');
                    root.style.setProperty('--text-color', '#000000');
                    root.style.setProperty('--button-bg', '#4CAF50');
                    root.style.setProperty('--button-text', '#ffffff');
                } else {
                    root.style.setProperty('--bg-color', '#333333');
                    root.style.setProperty('--text-color', '#ffffff');
                    root.style.setProperty('--button-bg', '#ffffff');
                    root.style.setProperty('--button-text', '#000000');
                }
            }

            async function unblock(url) {
                const urlInput = url;
                const titleInput = document.getElementById('titleInput').value;

                if (!urlInput) {
                    alert('Please enter a URL!');
                    return;
                }

                // Generate AES key and IV
                const key = crypto.getRandomValues(new Uint8Array(32)); // 256-bit key
                const iv = crypto.getRandomValues(new Uint8Array(16)); // 128-bit IV

                // Encrypt URL
                const encoder = new TextEncoder();
                const data = encoder.encode(urlInput);
                const encryptedUrl = await window.crypto.subtle.encrypt(
                    { name: "AES-CBC", iv },
                    await window.crypto.subtle.importKey("raw", key, "AES-CBC", false, ["encrypt"]),
                    data
                );

                // Send encrypted data to the server
                const payload = {
                    encryptedUrl: btoa(String.fromCharCode(...new Uint8Array(encryptedUrl))),
                    key: btoa(String.fromCharCode(...key)),
                    iv: btoa(String.fromCharCode(...iv)),
                    title: titleInput,
                };

                const win = window.open();
                fetch('/open', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => response.text())
                .then(content => {
                    win.document.open();
                    win.document.write(content);
                    win.document.close();
                })
                .catch(err => {
                    win.document.body.innerHTML = "<h1>Error loading site</h1>";
                });
            }
        </script>
    </body>
    </html>
    `;
    res.send(clientPage);
});


app.post('/open', (req, res) => {
    try {
        const { encryptedUrl, key, iv, title } = req.body;

        // Decode received data
        const decryptedKey = Buffer.from(key, 'base64');
        const decryptedIv = Buffer.from(iv, 'base64');
        const encryptedData = Buffer.from(encryptedUrl, 'base64');

        // Decrypt URL
        const decipher = crypto.createDecipheriv('aes-256-cbc', decryptedKey, decryptedIv);
        let decryptedUrl = decipher.update(encryptedData, 'base64', 'utf8');
        decryptedUrl += decipher.final('utf8');

        // Generate iframe page for proxied site
        const iframeHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title || 'Proxied Site'}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                    }
                    iframe {
                        width: 100vw;
                        height: 100vh;
                        border: none;
                    }
                </style>
            </head>
            <body>
                <iframe src="/fetch/${Buffer.from(decryptedUrl).toString('base64')}" allowfullscreen></iframe>
            </body>
            </html>
        `;
        res.send(iframeHtml);
    } catch (err) {
        res.status(500).send('<h1>Server Error</h1>');
    }
});

// WebSocket handler
Unblocker.ws(server);

// Start the server
const PORT = 8080;
server.listen(PORT, () => {
    const interfaces = os.networkInterfaces();
    console.log(`Server is running on the following addresses:`);

    for (const [name, addresses] of Object.entries(interfaces)) {
        addresses.forEach((addressInfo) => {
            if (addressInfo.family === 'IPv4') {
                console.log(`- ${name}: http://${addressInfo.address}:${PORT}`);
            }
        });
    }

    console.log(`(Localhost) http://localhost:${PORT}`);
});