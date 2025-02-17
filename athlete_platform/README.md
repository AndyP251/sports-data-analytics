# Athlete Platform

A platform for athletes to track and analyze their biometric data across multiple sources.

## Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Redis 7+
- PostgreSQL 14+
- AWS Account (for S3 storage)

### Local Development Environment

1. **Clone Repository and Setup Environment**
```bash
git clone https://github.com/yourusername/athlete-platform.git
cd athlete-platform

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Unix
.\venv\Scripts\activate   # Windows
```

2. **Configure Environment Variables**
```bash
# Copy example env file
cp .env.example athlete_platform/.env

# Edit .env file with your configurations
nano athlete_platform/.env
```

3. **Start Required Services**

Start Redis Server:
```bash
# Install Redis (MacOS)
brew install redis

# Install Redis (Ubuntu)
sudo apt-get install redis-server

# Start Redis Server
redis-server

# Verify Redis is running
redis-cli ping  # Should return "PONG"
```

Start PostgreSQL:
```bash
# Ensure PostgreSQL is running
sudo service postgresql start  # Linux
brew services start postgresql@14  # MacOS
```

4. **Install Dependencies and Run Migrations**
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate
```

5. **Start Development Servers**

Backend:
```bash
# From athlete_platform directory
python manage.py runserver
```

Frontend:
```bash
# From frontend directory
cd frontend
npm install
npm run dev
```

### Environment Variables Location
The `.env` file should be placed in the following location:
```
athlete_platform/
├── athlete_platform/
│   ├── .env  # Place here
│   ├── settings.py
│   └── ...
├── frontend/
└── ...
```

## Production Deployment (DigitalOcean)

### Prerequisites
- DigitalOcean account
- Domain name (optional but recommended)
- Docker & Docker Compose installed locally

### Estimated Monthly Costs (Minimum Viable Setup)
- Droplet (Basic Plan): $4-$8/month (1GB RAM)
- Managed Database (PostgreSQL): $15/month (1GB RAM)
- Managed Redis: $15/month (1GB RAM)
- S3-Compatible Spaces: $5/month (250GB storage)
**Total Estimated Cost**: $39-43/month

### Deployment Steps

1. **Create DigitalOcean Resources**
```bash
# Create Droplet
- Choose Ubuntu 22.04 LTS
- Basic Plan ($4-8/month)
- Choose datacenter region
- Add SSH key
- Create Droplet

# Create Managed Database
- Choose PostgreSQL
- Basic Plan ($15/month)
- Same region as Droplet

# Create Managed Redis
- Basic Plan ($15/month)
- Same region as Droplet

# Create Spaces (S3-compatible storage)
- Choose region
- Create bucket
```

2. **Configure Domain & SSL**
```bash
# Add Domain to DigitalOcean
- Add domain in DO dashboard
- Configure A record pointing to Droplet IP

# Install Certbot and get SSL certificate
ssh root@your_droplet_ip
apt-get update
apt-get install certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

3. **Deploy Application**
```bash
# SSH into your Droplet
ssh root@your_droplet_ip

# Clone repository
git clone https://github.com/yourusername/athlete-platform.git
cd athlete-platform

# Copy and edit production env file
cp .env.example athlete_platform/.env.prod
nano athlete_platform/.env.prod

# Build and start services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

4. **Configure Nginx**
```bash
# Install Nginx
apt-get install nginx

# Configure Nginx
nano /etc/nginx/sites-available/athlete-platform

# Create symlink
ln -s /etc/nginx/sites-available/athlete-platform /etc/nginx/sites-enabled/

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

### Production Monitoring

1. **Setup Basic Monitoring**
```bash
# Install monitoring tools
apt-get install htop
apt-get install netdata

# View monitoring dashboard
http://your_droplet_ip:19999
```

2. **Configure Logging**
```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Procedures

1. **Database Backups**
```bash
# Automated daily backups (included with DO managed databases)
# Manual backup:
pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} > backup.sql
```

2. **Application Data Backups**
```bash
# Backup .env files
cp athlete_platform/.env.prod athlete_platform/.env.prod.backup

# Backup user uploads (if any)
rsync -av /path/to/uploads/ /path/to/backup/
```

## Common Issues & Troubleshooting

### Redis Connection Issues
```bash
# Check Redis status
redis-cli -h ${REDIS_HOST} ping

# Monitor Redis
redis-cli -h ${REDIS_HOST} monitor
```

### Database Issues
```bash
# Connect to database
psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME}

# Check connections
SELECT * FROM pg_stat_activity;
```

### Security Considerations
- Enable UFW firewall
- Regular security updates
- Monitor API access logs
- Implement rate limiting
- Regular dependency updates

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE.md file for details

## Service Architecture & Optimization Guide

### Redis Usage
1. **Caching Layer** (Redis DB 0)
   - Stores API response caches
   - Caches processed biometric data
   - Optimization: Configure cache invalidation policies
   - Consider: Implement cache warming for frequent queries

2. **Task Queue** (Redis DB 1)
   - Manages Celery task queue for data syncs
   - Handles background processing jobs
   - Optimization: Monitor queue length and worker count
   - Consider: Add queue prioritization

3. **Resource Locks** (Redis DB 2)
   - Manages concurrent access to resources
   - Prevents duplicate data processing
   - Current locks:
     - Processing locks (300s timeout)
     - Sync locks (600s timeout)
   - Optimization: Implement deadlock detection

4. **Rate Limiting** (Redis DB 3)
   - Tracks API rate limits for Garmin/Whoop
   - Manages user request quotas
   - Optimization: Add adaptive rate limiting

### PostgreSQL Usage
1. **User Data**
   - Athlete profiles
   - Authentication data
   - OAuth tokens
   - Optimization: Add index on frequently queried fields

2. **Biometric Data**
   - Core biometric measurements
   - Daily aggregated stats
   - Optimization: Implement table partitioning by date

### S3 Storage
1. **Raw Data Storage**
   - Stores raw API responses
   - Path structure: `accounts/{user_id}/biometric-data/{source}/{YYYYMMDD}_{HHMMSS}.json`
   - Optimization: Implement lifecycle policies

2. **Processed Data**
   - Stores normalized biometric data
   - Optimization: Add compression for older data

### Recommended Improvements
1. **Monitoring**
   - Add Redis monitoring (redis-exporter)
   - Set up PostgreSQL query analysis
   - Implement S3 access logging

2. **Performance**
   - Configure Redis persistence settings
   - Optimize PostgreSQL vacuum settings
   - Set up S3 transfer acceleration

3. **Scaling**
   - Add Redis Sentinel for HA
   - Configure PostgreSQL read replicas
   - Implement S3 cross-region replication

4. **Security**
   - Regular Redis security audits
   - PostgreSQL connection pooling
   - S3 bucket policies review









[Rest of the development setup remains the same]

### Estimated Monthly Costs (Minimum Viable Setup)
- Droplet (Basic Plan): $4-$8/month (1GB RAM)
- Managed Database (PostgreSQL): $15/month (1GB RAM)
- S3-Compatible Spaces: $5/month (250GB storage)
**Total Estimated Cost**: $24-28/month

### Future Scaling Considerations
As the application grows, you may need to add:

1. **Redis**
   - For distributed caching
   - Task queue management
   - Rate limiting
   - Real-time features
   - Required when scaling horizontally across multiple servers

2. **Background Tasks**
   - Initially handled synchronously
   - Can be moved to AWS Lambda or Celery+Redis when scale requires

3. **Caching Strategy**
   - Currently using local memory cache
   - Redis implementation needed for multi-server deployments

### Current Implementation Notes
- Using Django's built-in local memory cache
- Background tasks run synchronously
- Resource locks are handled in-memory
- Suitable for single-server deployment

[Rest of the README remains the same]