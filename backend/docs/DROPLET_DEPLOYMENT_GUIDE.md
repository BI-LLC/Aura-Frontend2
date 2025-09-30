# 🚀 Digital Ocean Droplet Deployment Guide

## 📋 Overview

This guide covers deploying the Aura Voice AI backend to a Digital Ocean droplet. The deployment includes setting up the Python environment, installing dependencies, configuring systemd services, and ensuring the server runs reliably.

## 🎯 Prerequisites

- Digital Ocean droplet with Ubuntu 22.04+
- SSH access to the droplet
- GitHub repository with backend code
- API keys configured in `.env` file

## 📁 Repository Structure

The deployment uses a backend-only repository structure:
```
Aura/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── services/
│   │   ├── routers/
│   │   └── models/
│   ├── requirements.txt
│   └── .env
├── docs/
├── test/
└── docker-compose.yml
```

## 🔧 Step-by-Step Deployment

### 1. Clone Repository on Droplet

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Clone the repository
git clone -b master https://github.com/BI-LLC/Aura.git

# Navigate to the repository
cd Aura

# Verify the structure
ls -la
```

### 2. Create Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install build tools
pip install --upgrade pip setuptools wheel
```

### 3. Install Python Dependencies

```bash
# Install core dependencies
pip install fastapi uvicorn python-multipart websockets pydantic pydantic-settings python-dotenv openai httpx supabase PyJWT bcrypt passlib redis elevenlabs

# Install document processing dependencies
pip install PyPDF2 python-docx pydub

# Install text processing dependencies
pip install markdown beautifulsoup4

# Install async file operations
pip install aiofiles

# Install numerical processing
pip install numpy
```

### 4. Configure Environment Variables

```bash
# Navigate to backend directory
cd backend

# Create .env file with your API keys
nano .env
```

**Required .env variables:**
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Application Configuration
ENVIRONMENT=production
DEBUG=False
```

### 5. Test Manual Server Start

```bash
# Test if the server starts correctly
cd /root/Aura/backend
source ../venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 6. Configure Systemd Service

Create the systemd service file:

```bash
sudo cat > /etc/systemd/system/aura.service << 'EOF'
[Unit]
Description=Aura FastAPI / Uvicorn Application
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/root/Aura/backend
ExecStart=/root/Aura/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3
User=root
Group=root
Environment="PYTHONUNBUFFERED=1"
Environment="PYTHONPATH=/root/Aura/backend:/root/Aura"
EnvironmentFile=-/root/Aura/.env

[Install]
WantedBy=multi-user.target
EOF
```

### 7. Enable and Start Service

```bash
# Reload systemd daemon
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable aura

# Start the service
sudo systemctl start aura

# Check service status
sudo systemctl status aura --no-pager
```

### 8. Configure Firewall

```bash
# Allow port 8000 through firewall
sudo ufw allow 8000

# Check firewall status
sudo ufw status
```

### 9. Test Server Health

```bash
# Test local health check
curl http://localhost:8000/health

# Test external access
curl http://YOUR_DROPLET_IP:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "mode": "multi-tenant",
  "services": {
    "tenant_manager": true,
    "auth_service": true,
    "smart_router": true,
    "memory": true,
    "voice": true,
    "persona": true,
    "data_service": true,
    "conversation_manager": true
  },
  "tenant_services": {
    "data_ingestion": true,
    "smart_router": true,
    "voice_pipeline": true
  },
  "websocket": {
    "continuous_voice": true,
    "ready": true
  },
  "tenants_active": 2
}
```

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Service Fails to Start - Missing Dependencies

**Error:** `ModuleNotFoundError: No module named 'PyPDF2'`

**Solution:**
```bash
# Install missing dependencies
cd /root/Aura
source venv/bin/activate
pip install PyPDF2 python-docx pydub markdown beautifulsoup4 aiofiles numpy
```

#### 2. Service Fails to Start - Virtual Environment Not Found

**Error:** `status=203/EXEC`

**Solution:**
```bash
# Recreate virtual environment
cd /root/Aura
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
# Reinstall all dependencies
```

#### 3. Port Already in Use

**Error:** `Address already in use`

**Solution:**
```bash
# Find process using port 8000
sudo lsof -i :8000

# Kill the process
sudo kill -9 PID_NUMBER

# Restart service
sudo systemctl restart aura
```

#### 4. Service Keeps Restarting

**Check logs:**
```bash
# View recent logs
sudo journalctl -u aura --no-pager -n 50

# Follow logs in real-time
sudo journalctl -u aura -f
```

### Service Management Commands

```bash
# Check service status
sudo systemctl status aura

# Start service
sudo systemctl start aura

# Stop service
sudo systemctl stop aura

# Restart service
sudo systemctl restart aura

# View logs
sudo journalctl -u aura --no-pager

# Follow logs
sudo journalctl -u aura -f
```

## 🔒 Security Considerations

### 1. Firewall Configuration

```bash
# Only allow necessary ports
sudo ufw allow ssh
sudo ufw allow 8000
sudo ufw enable
```

### 2. Environment Variables

- Never commit `.env` files to version control
- Use strong, unique API keys
- Regularly rotate API keys
- Consider using a secrets management service

### 3. User Permissions

```bash
# Create a dedicated user (optional)
sudo adduser aura
sudo usermod -aG sudo aura

# Update service to use dedicated user
sudo systemctl edit aura
```

## 📊 Monitoring and Maintenance

### Health Check Endpoints

- **Health Check:** `GET /health`
- **API Status:** `GET /api/status`
- **Voice Pipeline:** `GET /voice/status`

### Log Monitoring

```bash
# Monitor service logs
sudo journalctl -u aura -f

# Monitor system logs
sudo tail -f /var/log/syslog
```

### Performance Monitoring

```bash
# Check memory usage
free -h

# Check CPU usage
top

# Check disk usage
df -h
```

## 🚀 Production Optimizations

### 1. Use Gunicorn with Uvicorn Workers

```bash
# Install gunicorn
pip install gunicorn

# Update systemd service
sudo systemctl edit aura
```

**Updated service configuration:**
```ini
[Service]
ExecStart=/root/Aura/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 2. Enable HTTPS with Nginx

```bash
# Install nginx
sudo apt update
sudo apt install nginx

# Configure nginx
sudo nano /etc/nginx/sites-available/aura
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Set up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 📝 Maintenance Checklist

### Daily
- [ ] Check service status: `sudo systemctl status aura`
- [ ] Monitor logs for errors: `sudo journalctl -u aura --no-pager -n 50`
- [ ] Verify health endpoint: `curl http://localhost:8000/health`

### Weekly
- [ ] Check disk space: `df -h`
- [ ] Review error logs: `sudo journalctl -u aura --since "1 week ago" | grep ERROR`
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`

### Monthly
- [ ] Rotate API keys
- [ ] Review and clean old logs
- [ ] Check for security updates
- [ ] Backup configuration files

## 🆘 Emergency Procedures

### Service Recovery

```bash
# If service fails completely
sudo systemctl stop aura
sudo systemctl start aura

# If virtual environment is corrupted
cd /root/Aura
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
sudo systemctl restart aura
```

### Complete Rebuild

```bash
# Stop service
sudo systemctl stop aura

# Remove old installation
cd /root
rm -rf Aura

# Clone fresh copy
git clone -b master https://github.com/BI-LLC/Aura.git
cd Aura

# Follow deployment steps again
```

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the logs: `sudo journalctl -u aura --no-pager -n 100`
2. Verify all dependencies are installed
3. Check environment variables are correct
4. Ensure firewall allows port 8000
5. Verify the service configuration

---

**Last Updated:** September 26, 2025  
**Version:** 1.0  
**Compatible with:** Aura Voice AI v4.0.0+
