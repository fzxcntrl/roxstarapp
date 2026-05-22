#!/bin/bash

echo "🔧 Applying system-level malloc debugging fix..."

# Create a system-wide environment file
sudo tee /etc/environment > /dev/null << 'EOF'
MallocStackLogging=0
MallocScribble=0
MallocPreScribble=0
MallocGuardEdges=0
MallocNanoZone=1
EOF

# Create launchd environment
sudo tee /Library/LaunchDaemons/disable-malloc-debug.plist > /dev/null << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>disable-malloc-debug</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/launchctl</string>
        <string>setenv</string>
        <string>MallocStackLogging</string>
        <string>0</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ System-level fix applied"
echo "🔄 Restart your Mac for full effect"
echo "💡 Or run: sudo launchctl load /Library/LaunchDaemons/disable-malloc-debug.plist"