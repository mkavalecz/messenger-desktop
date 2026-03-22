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
