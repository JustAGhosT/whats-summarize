# ConvoLens - Runbook

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Common Tasks](#common-tasks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Backup and Recovery](#backup-and-recovery)
- [Scaling](#scaling)
- [Security](#security)

## Overview
This runbook contains operational procedures for the ConvoLens application.

## Prerequisites
- Access to Supabase dashboard
- Node.js 18+ installed
- pnpm installed
- Supabase CLI installed

## Common Tasks

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/JustAGhosT/whats-summarize.git
cd whats-summarize

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start development server
pnpm dev
```

### Production Deployment
```bash
# Build the application
pnpm build

# Start production server
pnpm start

# (Deployment process to be defined)
```

### Database Migrations
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

## Monitoring

### Key Metrics to Monitor
- **API Response Time**: Should be < 500ms for 95% of requests
- **Error Rate**: Should be < 1% of total requests
- **Database Connections**: Monitor for connection leaks
- **Storage Usage**: Keep below 80% of allocated space

### Logging
- Frontend errors are logged to Sentry
- Backend logs are available in Supabase dashboard
- Application logs are streamed to LogDNA

## Troubleshooting

### Common Issues

#### High CPU Usage
1. Check current processes: `top` or `htop`
2. Identify problematic process
3. Check application logs for errors
4. Restart service if needed

#### Database Connection Issues
1. Check Supabase status page
2. Verify database credentials in environment variables
3. Check connection pool limits
4. Look for long-running queries

#### Authentication Failures
1. Verify JWT secret matches between frontend and backend
2. Check token expiration time
3. Verify OAuth provider configurations

## Backup and Recovery

### Database Backups
- Automated daily backups in Supabase
- Manual backup: `supabase db dump --db-url $DATABASE_URL > backup.sql`

### File Storage Backups
- Enable versioning in Supabase Storage
- Regular exports to cloud storage

### Recovery Procedure
1. Restore latest database backup
2. Restore file storage from backup
3. Verify data integrity
4. Update application configuration if needed

## Scaling

### Vertical Scaling
- Upgrade Supabase instance size
- Increase CPU/RAM allocation

### Horizontal Scaling
- Add more application instances
- Configure load balancer
- Enable database read replicas

## Security

### Regular Tasks
- Rotate API keys quarterly
- Update dependencies weekly
- Review access logs monthly
- Conduct security audits quarterly

### Incident Response
1. Identify the incident
2. Contain the impact
3. Eradicate the cause
4. Recover systems
5. Document the incident
6. Review and improve

## Maintenance Schedule

### Daily
- Check application health
- Review error logs
- Monitor resource usage

### Weekly
- Apply security updates
- Rotate logs
- Verify backups

### Monthly
- Review access logs
- Update documentation
- Test recovery procedures

## Contact Information
- **Primary On-call**: [Name] - [Phone] - [Email]
- **Secondary On-call**: [Name] - [Phone] - [Email]
- **Infrastructure Team**: infra@convolens.com
- **Security Team**: security@convolens.com
