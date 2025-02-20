# Athlete Platform

A scalable web-based platform for athletes to track and analyze their biometric data across multiple sources (Garmin, WHOOP, Catapult).

## 🚀 Technology Stack

### Frontend
- React + Vite
- Material-UI & Tailwind CSS
- Axios for API handling
- Chart.js for data visualization

### Backend
- Django REST Framework
- PostgreSQL
- AWS S3 for storage
- Django Allauth for authentication
- Encryption using Fernet

### DevOps
- Docker & Docker Compose
- Nginx for production
- AWS S3 for static/media files

## 🛠 Development Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+
- AWS Account (for S3)
- PostgreSQL 14+ (if running locally)

### Environment Variables
Create `.env` file in project root:

bash
Django Settings
DJANGO_SECRET_KEY=your_secret_key
DJANGO_DEBUG=True
DEVELOPMENT_MODE=True
DEVELOPMENT_PASSWORD=your_dev_password
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
Database
DB_NAME=athlete_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=db
DB_PORT=5432
AWS S3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_STORAGE_BUCKET_NAME=your_bucket
AWS_S3_REGION_NAME=your_region
Garmin API (Optional)
GARMIN_USERNAME=your_username
GARMIN_PASSWORD=your_password
GARMIN_ACCOUNT_ENCRYPTION_KEY=your_encryption_key
WHOOP API (Optional)
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_secret


### Local Development

1. Start Development Environment:
bash
Start all services
docker-compose -f docker-compose.dev.yml up --build
Backend only
docker-compose -f docker-compose.dev.yml up backend
Frontend only
docker-compose -f docker-compose.dev.yml up frontend


2. Access Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Admin Interface: http://localhost:8000/admin
- PostgreSQL: localhost:5432

### Creating Test Users
bash
Create athlete user
docker-compose exec backend python manage.py manage_users \
--create-user="athlete@example.com" \
--password="SecurePass123!" \
--role="ATHLETE"
Create coach user
docker-compose exec backend python manage.py manage_users \
--create-user="coach@example.com" \
--password="SecurePass123!" \
--role="COACH"



## 🚀 Production Deployment

1. Configure Production Environment:
bash
Update environment variables for production
cp .env.example .env.prod
nano .env.prod


2. Deploy Using Docker:
bash
Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

3. Production Services:
- Frontend: http://your-domain.com
- Backend API: http://your-domain.com/api
- Admin: http://your-domain.com/admin

## 🔧 Common Issues & Solutions

### Database Issues

bash
Reset database
docker-compose down -v
docker-compose up -d db
docker-compose exec backend python manage.py migrate
Check database logs
docker-compose logs db


### S3 Storage Issues
bash
Verify S3 configuration
docker-compose exec backend python manage.py manage_users --verify-s3
Rebuild S3 structure
docker-compose exec backend python manage.py manage_users --rebuild-s3


### CORS/CSRF Issues
- Ensure CORS_ALLOWED_ORIGINS matches your frontend URL
- Check CSRF token in requests
- Verify cookie settings match between frontend/backend

### Docker Issues
bash
Clean up Docker resources
docker-compose down
docker system prune -f
docker volume prune -f
Rebuild specific service
docker-compose build --no-cache backend


### Frontend Build Issues
bash
Clean install dependencies
docker-compose exec frontend npm clean-install
Clear Vite cache
docker-compose exec frontend npm run clean

## 📝 API Documentation

### Authentication Endpoints
- POST /api/auth/register/
  - Register new user
  - Required fields: email, password, role

- POST /api/auth/login/
  - Login user
  - Required fields: email, password

- POST /api/auth/logout/
  - Logout user
  - Requires authentication

### Data Endpoints
- GET /api/athlete/data/
  - Get athlete's data
  - Requires authentication
  - Query params: start_date, end_date

- POST /api/athlete/data/sync/
  - Sync data from external sources
  - Requires authentication
  - Optional params: source (garmin/whoop/catapult)

- GET /api/athlete/biometrics/
  - Get athlete's biometric data
  - Requires authentication
  - Query params: metrics, timeframe

## 🎯 Project Goals

1. Data Integration
- Garmin Connect API integration
- WHOOP API integration
- Catapult API integration
- Standardized data format across sources

2. Analytics
- Real-time biometric monitoring
- AI-powered insights
- Performance trend analysis
- Custom metric calculations

3. Security
- End-to-end encryption
- Secure credential storage
- Role-based access control
- Regular security audits

4. Scalability
- Microservices architecture
- Caching implementation
- Background task processing
- Load balancing

## 🔍 Development Guidelines

### Code Style
- Follow PEP 8 for Python code
- Use ESLint for JavaScript
- Implement type hints in Python
- Document all functions and classes

### Testing
bash
Run backend tests
docker-compose exec backend python manage.py test
Run frontend tests
docker-compose exec frontend npm test
Check coverage
docker-compose exec backend coverage run manage.py test
docker-compose exec backend coverage report

### Git Workflow
1. Create feature branch from develop
2. Make changes and test locally
3. Submit PR to develop
4. CI/CD runs tests
5. Code review
6. Merge to develop

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

### Pull Request Guidelines
- Include test coverage
- Update documentation
- Follow code style guidelines
- Add meaningful commit messages

## 📄 License

MIT License - see LICENSE.md

## 🔗 Related Documentation
- [Django REST Framework](https://www.django-rest-framework.org/)
- [React + Vite](https://vitejs.dev/)
- [Docker Compose](https://docs.docker.com/compose/)
- [AWS S3](https://aws.amazon.com/s3/)
- [Garmin API](https://developer.garmin.com/)
- [WHOOP API](https://developer.whoop.com/)

## 📞 Support

For support, please:
1. Check existing issues
2. Review documentation
3. Create detailed issue if needed
4. Join our Discord community

## 🔄 Updates & Maintenance

- Regular dependency updates
- Security patches
- Feature additions
- Performance optimizations
- Documentation updates
