#!/bin/sh
echo "[Tor] Starting Tor daemon..."
tor --SocksPort 127.0.0.1:9050 --RunAsDaemon 1

echo "[Node] Starting Wisp server..."
exec node server.mjs
