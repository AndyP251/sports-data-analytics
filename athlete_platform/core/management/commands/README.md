# 🛠️ Management Commands Documentation

## User Management CLI Tool (`manage_users.py`)

### 🎯 Purpose
This command-line interface provides comprehensive user management capabilities for the Athlete Platform, handling both database operations and AWS S3 storage management.

### 🚀 Available Commands

#### 1. List All Users
```bash
python manage.py manage_users --list
```
Displays all users in the system with their email, ID, and role.

#### 2. Create New User
```bash
python manage.py manage_users --create-user="athlete@example.com" --password="securepass" --role="ATHLETE"
```
**Options:**
- `--create-user`: Email address for the new user
- `--password`: User's password (required)
- `--role`: User role (choices: ATHLETE, COACH, ADMIN)

Creates a new user and automatically sets up their S3 directory structure: 

accounts/
└── {user_id}/
├── biometric-data/
├── metadata/
│ └── user_info.json
└── performance-data/


#### 3. Delete Specific User
```bash
python manage.py manage_users --delete-user="athlete@example.com"
```
Removes a user and their associated S3 directories.

#### 4. Clear All Users
```bash
python manage.py manage_users --clear-all
```
⚠️ **WARNING**: This is a destructive operation that:
- Deletes all users from the database
- Removes all user directories from S3
- Requires confirmation before execution

#### 5. Verify S3 Directories
```bash
python manage.py manage_users --verify-s3
```
Checks if all users have their required S3 directory structure intact.

#### 6. Rebuild S3 Directories
```bash
python manage.py manage_users --rebuild-s3
```
Reconstructs S3 directories for all users, useful for:
- Fixing corrupted directories
- Ensuring consistency
- Adding new directory structures

### 🔒 Security Notes
- All destructive operations require confirmation
- S3 operations are atomic and handled safely
- User passwords are properly hashed
- AWS credentials are pulled from Django settings

### 🔧 Technical Details
- Uses Django's management command framework
- Integrates with AWS S3 via boto3
- Handles both database and storage operations
- Provides detailed feedback for all operations

### 📝 Examples

**Create an athlete account:**
```bash
python manage.py manage_users \
    --create-user="athlete@example.com" \
    --password="SecurePass123!" \
    --role="ATHLETE"
```

**Create a coach account:**
```bash
python manage.py manage_users \
    --create-user="coach@example.com" \
    --password="SecurePass123!" \
    --role="COACH"
```

**Verify and fix storage:**
```bash
# First verify
python manage.py manage_users --verify-s3

# If issues found, rebuild
python manage.py manage_users --rebuild-s3
```

### 🚨 Troubleshooting

1. **S3 Access Issues**
   - Verify AWS credentials in settings
   - Check S3 bucket permissions
   - Ensure proper IAM roles

2. **User Creation Failures**
   - Check email format
   - Ensure password meets requirements
   - Verify role is valid

3. **Directory Issues**
   - Run --verify-s3 to check structure
   - Use --rebuild-s3 to fix problems
   - Check S3 bucket permissions

### 🤝 Contributing
When adding new commands:
1. Follow existing error handling patterns
2. Include confirmation for destructive operations
3. Update this README
4. Add appropriate logging
5. Test thoroughly

### 📚 Related Documentation
- [Django Management Commands](https://docs.djangoproject.com/en/stable/howto/custom-management-commands/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [Boto3 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)

---

📌 **Note**: Always backup data before running destructive operations. For production environments, test commands in staging first.