# Troubleshooting Connection Issues

## Server is Running ✅
Your server is running on port 5173. Here's how to fix connection issues:

## Quick Fixes

### 1. **Try These URLs:**

**On your computer:**
- `http://localhost:5173`
- `http://127.0.0.1:5173`

**On your phone (same Wi-Fi):**
- `http://192.168.0.181:5173`

### 2. **Windows Firewall Fix:**

If you see "connection failed", Windows Firewall might be blocking it:

1. Open **Windows Defender Firewall**
2. Click **Allow an app or feature through Windows Defender Firewall**
3. Click **Change Settings** (if needed)
4. Find **Node.js** or **npm**
5. Check both **Private** and **Public** boxes
6. If Node.js isn't listed, click **Allow another app** → Browse → Find `node.exe` (usually in `C:\Program Files\nodejs\`)

**Or use PowerShell (Run as Administrator):**
```powershell
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
```

### 3. **Clear Browser Cache:**
- Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or clear browser cache manually

### 4. **Check Browser Console:**
- Press `F12` to open Developer Tools
- Check the **Console** tab for errors
- Check the **Network** tab to see if requests are failing

### 5. **Verify Server is Running:**
Open a new terminal and run:
```bash
cd "C:\Users\manda\github\GitHub Repository Discovery App"
npm run dev
```

You should see:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.0.181:5173/
```

### 6. **Try Different Browser:**
- Chrome
- Firefox
- Edge
- Safari (Mac)

### 7. **Check for Port Conflicts:**
If port 5173 is busy, Vite will try another port. Check the terminal output for the actual port number.

### 8. **Restart the Server:**
1. Stop the server (Ctrl + C in terminal)
2. Run `npm run dev` again
3. Wait for it to fully start (10-30 seconds)

## Common Errors

### "ERR_CONNECTION_REFUSED"
- Server isn't running → Start it with `npm run dev`
- Firewall blocking → Fix firewall (see above)
- Wrong port → Check terminal for actual port

### "ERR_NETWORK_CHANGED"
- Wi-Fi connection issue
- Make sure phone and computer are on same network

### "This site can't be reached"
- Check the URL is correct
- Make sure you're using `http://` not `https://`
- Try `localhost` instead of IP address

### Blank Page / No Content
- Check browser console (F12) for JavaScript errors
- Make sure all dependencies are installed: `npm install`
- Check if there are compilation errors in the terminal

## Still Not Working?

1. **Check terminal output** - Look for error messages
2. **Verify dependencies** - Run `npm install` again
3. **Check Node.js version** - Should be 18+ (`node --version`)
4. **Try a different port** - Edit `vite.config.ts` and change port to 3000

## Need Help?

Check the terminal where you ran `npm run dev` for specific error messages. Share those errors for more help!
