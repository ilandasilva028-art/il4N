#!/usr/bin/env bash
# Arrête tableau de bord, API et moteur (les tâches reprendront au prochain démarrage grâce à SQLite).
for p in next-server "next start" "uvicorn api.server" supervisor.py "main.py watch" "main.py process" "streamlink twitch.tv"; do pkill -f "$p"; done
echo "arrêté"
