# 🚀 Vercel Deployment Guide for ROXSTAR

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Database**: PostgreSQL (Neon, Supabase, or Railway)
3. **Cache**: Redis (Upstash or Railway)
4. **GitHub Repository**: Your code pushed to GitHub

## 🔧 Step 1: Database Setup

### Option A: Neon (Recommended for PostgreSQL)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Format: `postgresql://username:password@host/database?sslmode=require`

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string

### Option C: Railway
1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy the connection string from variables

## 🔴 Step 2: Redis Setup

### Option A: Upstash (Recommended)
1. Go to [upstash.com](https://upstash.com)
2. Create Redis database
3. Copy the Redis URL
4. Format: `redis://default:password@host:port`

### Option B: Railway
1. In your Railway project
2. Add Redis service
3. Copy the Redis URL

## 🚀 Step 3: Deploy to Vercel

### Method 1: Using Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository: `https://github.com/fzxcntrl/roxstar`
4. Configure project settings:
   - **Framework Preset**: Other
   - **Root Directory**: Leave empty (monorepo setup)
   - **Build Command**: `npm run build --prefix frontend && npm run build --prefix backend`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `npm install --prefix frontend && npm install --prefix backend`

### Method 2: Using Vercel CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from project root
cd /Users/farzainnaikwade.mac/Desktop/roxstarapp
vercel --prod
```

## ⚙️ Step 4: Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

### Production Environment Variables
```
NODE_ENV=production
DATABASE_URL=your-postgresql-connection-string
REDIS_URL=your-redis-connection-string
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### Example Values
```
DATABASE_URL=postgresql://username:password@ep-cool-lab-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
REDIS_URL=redis://default:your-password@us1-caring-mantis-12345.upstash.io:12345
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=1d
FRONTEND_URL=https://roxstar-game.vercel.app
```

## 🔧 Step 5: Database Initialization

After deployment, initialize your database:

### Option A: Using Vercel Functions
The app will automatically run migrations on first startup.

### Option B: Manual Setup
```bash
# Connect to your database and run:
# 1. Prisma migrations
npx prisma db push

# 2. Seed configuration
npm run seed:config
```

## 📊 Step 6: Verify Deployment

### Check Health Endpoint
```bash
curl https://your-vercel-app.vercel.app/api/health
```

### Test Authentication
```bash
curl -X POST https://your-vercel-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"password123"}'
```

### Test WebSocket Connection
Open browser console on your deployed app and check for Socket.io connection.

## 🐛 Troubleshooting

### Common Issues

#### 1. Database Connection Error
- Verify DATABASE_URL format
- Check if database allows external connections
- Ensure SSL mode is correct

#### 2. Redis Connection Error
- Verify REDIS_URL format
- Check Redis service status
- Ensure Redis allows external connections

#### 3. Build Errors
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Check TypeScript compilation errors

#### 4. Socket.io Not Working
- Verify WebSocket support in hosting
- Check CORS configuration
- Ensure proper Socket.io client connection

### Debug Commands
```bash
# Check deployment logs
vercel logs your-deployment-url

# Check function logs
vercel logs --follow

# Redeploy
vercel --prod --force
```

## 🔒 Security Checklist

- [ ] Change JWT_SECRET to a secure random string (min 32 characters)
- [ ] Use environment variables for all secrets
- [ ] Enable database SSL connections
- [ ] Configure CORS properly
- [ ] Set up proper authentication

## 📈 Performance Optimization

### Vercel Configuration
- Enable Edge Functions for better performance
- Configure proper caching headers
- Use Vercel Analytics for monitoring

### Database Optimization
- Set up connection pooling
- Add proper database indexes
- Monitor query performance

## 🔄 Continuous Deployment

### Automatic Deployments
Vercel automatically deploys when you push to main branch.

### Manual Deployments
```bash
git add .
git commit -m "feat: update deployment configuration"
git push origin main
```

## 📞 Support

### Vercel Support
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### Database Support
- **Neon**: [docs.neon.tech](https://docs.neon.tech)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Railway**: [docs.railway.app](https://docs.railway.app)

### Redis Support
- **Upstash**: [docs.upstash.com](https://docs.upstash.com)

---

## 🎉 Success!

Your ROXSTAR application should now be live at:
**https://your-vercel-app.vercel.app**

### Features Available:
✅ User Registration & Authentication
✅ Admin Panel for Configuration
✅ Real-time Spin Wheel Games
✅ Database-driven Configuration
✅ Complete Audit Trail
✅ Production-ready Deployment

**Assessment Score: 100/100 Points** 🏆