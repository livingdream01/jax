# APEX — Service Operations (ITIL)

## Known Error Record (KEDB)

### KE-001 — Dev server goes offline after shell session ends

**Status:** RESOLVED (permanent fix deployed)

**Service:** APEX Assistant (localhost:3001)

**Category:** Availability / Process Management

---

#### Incident
User reports "cannot view the server" repeatedly. Port 3001 goes down between
development sessions.

#### Root Cause (Problem Management)
The dev server was spawned as an **ad-hoc child process** of an ephemeral tool
session (`spawn(..., { detached: true, unref() })`). When the parent session's
process group was torn down, the `next dev` process was killed with it. No
managed service existed, so nothing brought it back.

**Effect:** Every tool session ending = server down = incident recurrence.

#### Workaround (temporary)
Manually restart: `cd ~/jax && npm run dev` (fragile — died with the session).

#### Permanent Resolution (Change Management)
Registered APEX as a **launchd** service (macOS native service manager):

| Attribute | Value |
|-----------|-------|
| Label | `com.apex.assistant` |
| Plist | `~/Library/LaunchAgents/com.apex.assistant.plist` |
| Command | `node node_modules/next/dist/bin/next dev -p 3001` |
| WorkingDirectory | `/Users/mac/jax` |
| RunAtLoad | true (starts on login/boot) |
| KeepAlive | true (auto-restart on crash/exit) |
| ThrottleInterval | 10s (prevents crash-loop floods) |
| Logs | `~/jax/logs/apex.{stdout,stderr}.log` |

**Result:** Server is OS-managed. Crash → launchd restarts within seconds.
No longer tied to any tool session.

---

## Operational Commands

```bash
# Start / stop / restart / status / logs
~/jax/scripts/apex-service.sh start
~/jax/scripts/apex-service.sh stop
~/jax/scripts/apex-service.sh restart
~/jax/scripts/apex-service.sh status
~/jax/scripts/apex-service.sh logs
```

Or directly with launchctl:

```bash
launchctl load   ~/Library/LaunchAgents/com.apex.assistant.plist   # start
launchctl unload ~/Library/LaunchAgents/com.apex.assistant.plist   # stop
launchctl list | grep apex                                          # status
```

---

## ITIL Lifecycle Mapping

| ITIL Practice | Action Taken |
|---------------|--------------|
| Incident Management | Identified recurring "server down" incident |
| Problem Management | RCA: ad-hoc child process killed with parent session |
| Change Management | Registered launchd service (controlled change) |
| Availability Management | KeepAlive + RunAtLoad = auto-recovery |
| Known Error DB | This record (KE-001) |
| Knowledge Management | Documented ops commands above |
