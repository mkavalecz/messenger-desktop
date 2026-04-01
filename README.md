# Messenger Desktop

A lightweight desktop wrapper for Facebook Messenger built with Electron.  
Loads https://www.facebook.com/messages, and provides desktop convenience features.

The application was tested on the latest versions of Windows, macOS, Ubuntu LTS and Linux Mint (Cinnamon).  
If you encounter any problems on other platforms, feel free to open an issue or a pull request.  
I will try my best to support all major operating systems, but given that I'm only one person, help is appreciated.

The application does **not** alter any official functionality or security mechanism.  
All communication occurs directly between the user and the official Messenger service.

This is an independent software project and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. 

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/V7V71X2P5Z)

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js | https://nodejs.org |

## Quick Start

```bash
# Install dependencies
npm install

# Run the app
npm start

# Build distributable installer
npm run build
```

## Features

- System tray integration with close-to-tray and minimize-to-tray as options
- Unread message badge (red dot) on tray icon
- Notifications for new messages
- Start minimized option
- Check for updates option
- Open links in your default browser
- Persisted session (stays logged in)
- Persisted window size/position
- Voice and video call support
- Windows, macOS, and Linux support

## Installation

### Windows

Windows may show a "Windows protected your PC" SmartScreen warning because the app is unsigned.

1. Click **More info**
2. Click **Run anyway**

### macOS

macOS will block the app on first launch because it is not notarized.

1. Run the DMG file and move the app to the Applications folder
2. Start the application from the Applications folder
3. The application will not start until it is allowed in the System Settings --> Privacy & Security
4. After allowing the application to run on the system start the application again
5. On the first launch (or after an update) allow microphone and camera access

After this first launch, you can open the app normally.

### Linux

### Debian-based distributions (.deb)

Install:  
`sudo dpkg -i messenger-desktop_*_amd64.deb`

Uninstall:  
`sudo dpkg -r messenger-desktop`

### RedHat-based distributions (.rpm)

Install:  
`sudo rpm -U messenger-desktop-*.x86_64.rpm`

Uninstall:  
`sudo rpm -e messenger-desktop`
