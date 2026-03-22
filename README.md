# Messenger Desktop

A lightweight desktop wrapper for Facebook Messenger built with Electron.  
Loads https://www.facebook.com/messages, and provides desktop convenience features.

The application does **not** alter any official functionality or security mechanism.  
All communication occurs directly between the user and the official Messenger service.

This is an independent software project and is not affiliated with, endorsed by, or sponsored by Meta Platforms, Inc. 

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
- Start minimized option
- Unread message badge (red dot) on tray icon
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

1. Open **Finder** and locate the app
2. Right-click (or Control-click) the app and select **Open**
3. Click **Open** in the dialog that appears

After this first launch, you can open the app normally.
