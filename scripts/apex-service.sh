#!/bin/zsh
# APEX Assistant service management script
# Wraps launchctl for lifecycle management (ITIL Availability + Change Mgmt)

set -e

LABEL="com.apex.assistant"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
STDOUT="$HOME/jax/logs/apex.stdout.log"
STDERR="$HOME/jax/logs/apex.stderr.log"
PORT=3001

case "${1:-status}" in
  start)
    echo "Starting APEX service..."
    launchctl load "$PLIST"
    echo "Service loaded. APEX running on http://localhost:${PORT}"
    ;;
  stop)
    echo "Stopping APEX service..."
    launchctl unload "$PLIST" 2>/dev/null || true
    echo "Service unloaded."
    ;;
  restart)
    echo "Restarting APEX service..."
    launchctl unload "$PLIST" 2>/dev/null || true
    sleep 1
    launchctl load "$PLIST"
    echo "Service restarted."
    ;;
  status)
    if launchctl list | grep -q "$LABEL"; then
      PID=$(launchctl list | grep "$LABEL" | awk '{print $1}')
      echo "APEX service: RUNNING (PID $PID)"
      echo "URL: http://localhost:${PORT}"
    else
      echo "APEX service: STOPPED"
    fi
    ;;
  logs)
    echo "--- stdout ---"
    tail -n 50 "$STDOUT" 2>/dev/null || echo "(no stdout log)"
    echo ""
    echo "--- stderr ---"
    tail -n 50 "$STDERR" 2>/dev/null || echo "(no stderr log)"
    ;;
  *)
    echo "Usage: apex-service.sh {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
