# Viewing the App on Mobile Device

## Quick Setup

### Step 1: Start the Dev Server

```bash
npm run dev
```

The server will start and show you the local URL. Look for something like:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

### Step 2: Find Your Computer's IP Address

**On Windows:**
1. Open Command Prompt or PowerShell
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your active network adapter
4. It will look like: `192.168.1.100`

**On Mac/Linux:**
1. Open Terminal
2. Type: `ifconfig` (Mac) or `ip addr` (Linux)
3. Look for your network interface (usually `en0` on Mac, `wlan0` on Linux)
4. Find the `inet` address (e.g., `192.168.1.100`)

### Step 3: Connect Your Mobile Device

**Important:** Your phone and computer must be on the **same Wi-Fi network**.

1. On your phone, open a web browser (Chrome, Safari, etc.)
2. Type in the address bar: `http://YOUR_IP_ADDRESS:5173`
   - Example: `http://192.168.1.100:5173`
3. The app should load on your phone!

## Alternative: Using QR Code

If Vite shows a QR code in the terminal, you can scan it with your phone's camera to open the app directly.

## Troubleshooting

### "Can't connect" or "Site can't be reached"

1. **Check firewall:**
   - Windows: Allow Node.js through Windows Firewall
   - Mac: System Settings → Firewall → Allow incoming connections

2. **Verify same network:**
   - Both devices must be on the same Wi-Fi
   - Mobile data won't work

3. **Check IP address:**
   - Make sure you're using the correct IP
   - Try the "Network" URL shown in Vite terminal

4. **Port blocked:**
   - Some routers block certain ports
   - Try a different port by modifying `vite.config.ts`:
     ```ts
     server: {
       host: true,
       port: 3000, // Try different port
     }
     ```

### App looks broken on mobile

- The app is designed for mobile (360px width)
- Make sure you're viewing it in portrait mode
- Clear browser cache if needed

### Slow loading

- This is normal for development
- Production build will be much faster
- Check your Wi-Fi connection speed

## For Production (Later)

When you're ready to deploy:
- Use Vercel, Netlify, or similar hosting
- The app will be accessible via a public URL
- No network configuration needed

## Quick Test

1. Start server: `npm run dev`
2. Note the Network URL (e.g., `http://192.168.1.100:5173`)
3. Open that URL on your phone's browser
4. Done! 🎉
