# NodeByte Looking Glass

A self-hosted network looking glass with a Next.js frontend and a Bun/Hono backend. Supports ping, traceroute, MTR, and BGP lookups from one or more nodes.

---

## Architecture

```
looking-glass/
├── backend/    # Bun + Hono API — runs on each network node
└── frontend/   # Next.js UI — runs once, points at one or more backends
```

The **backend** exposes a small HTTP API that runs system network tools (`ping`, `traceroute`, `mtr`, `birdc`). Deploy one instance per node/location you want to expose.

The **frontend** is a single Next.js app configured with the URLs of all your backend nodes. It can be hosted anywhere — Vercel, a VPS, etc.

---

## Prerequisites

### Every backend node
- [Bun](https://bun.sh) v1.0+
- Linux system tools: `ping`, `traceroute`, `mtr`
- BIRD2 (`birdc`) — only required if you want BGP lookups

### Frontend host
- Node.js 18+ and npm (or Bun)

---

## Backend Setup

Repeat these steps on **each node** you want to add.

### 1. Copy the backend directory to your node

```bash
scp -r looking-glass/backend user@your-node:/opt/looking-glass
```

Or clone the repo directly on the node.

### 2. Install dependencies

```bash
cd /opt/looking-glass
bun install
```

### 3. Configure the backend

Edit `config.json`:

```json
{
  "port": 8080
}
```

| Field  | Description                          |
|--------|--------------------------------------|
| `port` | Port the API listens on. Default `8080`. |

### 4. Run the backend

**Development (hot reload):**
```bash
bun run dev
```

**Production:**
```bash
bun run start
```

### 5. (Recommended) Run as a systemd service

Create `/etc/systemd/system/looking-glass.service`:

```ini
[Unit]
Description=NodeByte Looking Glass Backend
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/looking-glass
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now looking-glass
```

### Backend API reference

| Endpoint                        | Description                                      |
|---------------------------------|--------------------------------------------------|
| `GET /lg/ping?ip=<target>`      | 5-packet ICMP ping                               |
| `GET /lg/traceroute?ip=<target>`| Traceroute with 1s timeout, 1 probe per hop      |
| `GET /lg/mtr?ip=<target>`       | MTR report (5 cycles)                            |
| `GET /lg/bgp?ip=<target>`       | BGP route lookup via `birdc` (IP or CIDR subnet) |

All endpoints accept an IPv4/IPv6 address or a domain name, except BGP which requires an IP or CIDR prefix.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd looking-glass/frontend
npm install
```

### 2. Configure the frontend

Edit `config.json`. This file controls branding and the list of backend nodes shown in the UI.

```json
{
  "brand": {
    "name": "NodeByte",
    "logo": "https://example.com/logo.svg",
    "invertLogo": true
  },
  "locations": [
    {
      "name": "Europe",
      "backends": [
        {
          "name": "Helsinki, Finland",
          "url": "http://65.21.161.115:8080",
          "info": {
            "ipv4": "65.21.161.115",
            "ipv6": "2a01:4f9::1",
            "datacenter": "HEL-1",
            "location": "Europe"
          }
        }
      ]
    }
  ]
}
```

#### `brand`

| Field         | Description                                                              |
|---------------|--------------------------------------------------------------------------|
| `name`        | Display name shown in the header and footer.                             |
| `logo`        | URL to your logo image.                                                  |
| `invertLogo`  | Set `true` if your logo is dark and needs inverting in light mode.       |

#### `locations`

An array of location groups. Each group has a `name` (used as a label in the node selector) and a `backends` array.

#### `backends`

| Field            | Description                                              |
|------------------|----------------------------------------------------------|
| `name`           | Node display name shown in the selector and node grid.   |
| `url`            | Base URL of the backend API for this node.               |
| `info.ipv4`      | (Optional) IPv4 address shown in the node info card.     |
| `info.ipv6`      | (Optional) IPv6 address shown in the node info card.     |
| `info.datacenter`| (Optional) Datacenter identifier.                        |
| `info.location`  | (Optional) Human-readable location string.               |

All `info` fields are optional — omit or leave empty to hide them from the UI.

### 3. Run the frontend

**Development:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm run start
```

The frontend runs on port `3000` by default. Use a reverse proxy (nginx, Caddy) to expose it publicly with TLS.

---

## Production Deployment

### systemd — Frontend

Keep the Next.js process running as a systemd service on your frontend host.

Create `/etc/systemd/system/looking-glass-frontend.service`:

```ini
[Unit]
Description=NodeByte Looking Glass Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/looking-glass/frontend
ExecStart=/usr/bin/npm run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Build and enable:

```bash
cd /opt/looking-glass/frontend
npm run build

systemctl daemon-reload
systemctl enable --now looking-glass-frontend
```

> **Note:** The `User=` field should match whichever user owns `/opt/looking-glass/frontend`. If you're running as root, replace `www-data` with `root`.

---

### systemd — Backend

Each backend node needs its own service. The unit file is the same on every node.

Create `/etc/systemd/system/looking-glass-backend.service`:

```ini
[Unit]
Description=NodeByte Looking Glass Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/looking-glass/backend
ExecStart=/root/.bun/bin/bun run src/index.ts
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
systemctl daemon-reload
systemctl enable --now looking-glass-backend
```

Check the Bun binary path on your system with `which bun` and update `ExecStart` if it differs from `/root/.bun/bin/bun`.

---

### nginx — Frontend

Place this in `/etc/nginx/sites-available/looking-glass` and symlink it to `sites-enabled`.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name lg.yourdomain.com;

    # Redirect all HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name lg.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/lg.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lg.yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/looking-glass /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Obtain a certificate with Certbot if you don't have one yet:

```bash
certbot --nginx -d lg.yourdomain.com
```

---

### nginx — Backend (optional internal proxy)

If you want to front the backend with nginx on each node (e.g. for TLS or access logging), add a server block on the node:

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name node1.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/node1.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/node1.yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Restrict access to the frontend server's IP only
    allow <frontend-server-ip>;
    deny  all;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Then update the `url` field in the frontend `config.json` to use `https://node1.yourdomain.com` instead of the bare IP and port.

---

## Notes

- The backend runs commands directly on the host system. **Do not expose the backend API publicly** — it should only be reachable by your frontend server.
- BGP lookups require BIRD2 to be installed and running with `birdc` accessible in `$PATH`.
- The frontend fetches directly from backend URLs in the browser, so backend nodes must be reachable from end-users if you do not proxy through the frontend.
