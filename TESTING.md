# ROXSTAR Testing Guide

## 🧪 Test Scenarios

### 1. Authentication Flow
```bash
# Test user registration
POST /api/auth/register
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123"
}

# Test user login
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

# Test profile access
GET /api/auth/profile
Authorization: Bearer <token>
```

### 2. Admin Configuration Management
```bash
# Get current coin distribution
GET /api/config/coin-distribution
Authorization: Bearer <admin-token>

# Update coin distribution
PUT /api/config/coin-distribution
Authorization: Bearer <admin-token>
{
  "winnerPercentage": 0.75,
  "adminPercentage": 0.15,
  "appPercentage": 0.10
}

# Get game configuration
GET /api/config/game
Authorization: Bearer <admin-token>

# Update game configuration
PUT /api/config/game
Authorization: Bearer <admin-token>
{
  "autoStartDelayMinutes": 5,
  "eliminationIntervalSeconds": 10,
  "minParticipants": 2,
  "maxParticipants": 50
}
```

### 3. Spin Wheel Lifecycle Testing

#### Happy Path Test
1. **Admin creates wheel**
   ```bash
   POST /api/wheel
   Authorization: Bearer <admin-token>
   {
     "entryFee": 100
   }
   ```

2. **Users join wheel**
   ```bash
   POST /api/wheel/{wheelId}/join
   Authorization: Bearer <user-token>
   ```

3. **Auto-start or manual start**
   ```bash
   POST /api/wheel/{wheelId}/start
   Authorization: Bearer <admin-token>
   ```

4. **Monitor eliminations via Socket.io**
   - Connect to socket with user token
   - Join wheel room: `socket.emit('joinWheelRoom', wheelId)`
   - Listen for events: `wheel:elimination`, `wheel:winner`

#### Edge Case Tests

##### Insufficient Players Test
1. Create wheel
2. Have only 1-2 users join
3. Wait for auto-start delay
4. Verify wheel is aborted and users are refunded

##### Maximum Capacity Test
1. Create wheel
2. Have users join until max capacity reached
3. Verify additional join attempts are rejected

##### Concurrent Join Test
1. Create wheel
2. Have multiple users attempt to join simultaneously
3. Verify no duplicate entries and proper coin deduction

### 4. Real-Time Communication Testing

#### Socket.io Events
```javascript
// Frontend testing
const socket = io('http://localhost:4000', {
  auth: { token: localStorage.getItem('token') }
});

// Test user room
socket.emit('joinUserRoom', userId);
socket.on('wheel:coinUpdate', (data) => {
  console.log('Coin update:', data);
});

// Test wheel room
socket.emit('joinWheelRoom', wheelId);
socket.on('wheel:playerJoined', (data) => {
  console.log('Player joined:', data);
});

socket.on('wheel:started', (data) => {
  console.log('Game started:', data);
});

socket.on('wheel:elimination', (data) => {
  console.log('Player eliminated:', data);
});

socket.on('wheel:winner', (data) => {
  console.log('Winner announced:', data);
});
```

### 5. Database Integrity Testing

#### Concurrent Coin Operations
```sql
-- Test concurrent balance updates
BEGIN;
SELECT "coinBalance" FROM "User" WHERE "id" = 'user1' FOR UPDATE;
-- Simulate delay
SELECT pg_sleep(2);
UPDATE "User" SET "coinBalance" = "coinBalance" - 100 WHERE "id" = 'user1';
COMMIT;
```

#### Transaction Audit Trail
```sql
-- Verify all transactions are recorded
SELECT 
  t.*,
  u.username,
  sw.status as wheel_status
FROM "Transaction" t
JOIN "User" u ON t."userId" = u.id
LEFT JOIN "SpinWheel" sw ON t."spinWheelId" = sw.id
ORDER BY t."createdAt" DESC;
```

### 6. Performance Testing

#### Load Testing with Artillery
```yaml
# artillery-config.yml
config:
  target: 'http://localhost:4000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Join wheel stress test"
    requests:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
      - post:
          url: "/api/wheel/{{wheelId}}/join"
          headers:
            Authorization: "Bearer {{token}}"
```

#### Memory and CPU Monitoring
```bash
# Monitor backend performance
npm install -g clinic
clinic doctor -- node dist/server.js

# Monitor database connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
```

### 7. Error Handling Testing

#### Network Disconnection Simulation
1. Start game with multiple players
2. Disconnect network during elimination phase
3. Reconnect and verify game state recovery

#### Database Connection Loss
1. Start game
2. Stop PostgreSQL service briefly
3. Verify graceful error handling and recovery

#### Redis Connection Loss
1. Start game
2. Stop Redis service
3. Verify job queue recovery

### 8. Security Testing

#### Authentication Bypass Attempts
```bash
# Test without token
curl -X POST http://localhost:4000/api/wheel \
  -H "Content-Type: application/json" \
  -d '{"entryFee": 100}'

# Test with invalid token
curl -X POST http://localhost:4000/api/wheel \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"entryFee": 100}'

# Test user accessing admin endpoints
curl -X PUT http://localhost:4000/api/config/coin-distribution \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"winnerPercentage": 0.9}'
```

#### SQL Injection Testing
```bash
# Test malicious input
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "'; DROP TABLE users; --"}'
```

### 9. Configuration Validation Testing

#### Invalid Percentage Distribution
```bash
# Test percentages that don't sum to 1.0
PUT /api/config/coin-distribution
{
  "winnerPercentage": 0.8,
  "adminPercentage": 0.3,
  "appPercentage": 0.1
}
# Should return validation error
```

#### Invalid Game Parameters
```bash
# Test invalid min/max participants
PUT /api/config/game
{
  "minParticipants": 10,
  "maxParticipants": 5
}
# Should return validation error
```

### 10. Frontend Integration Testing

#### User Interface Flow
1. Register new user
2. Login and verify coin balance
3. Join available wheel
4. Monitor real-time updates
5. Verify winner announcement

#### Admin Interface Flow
1. Login as admin
2. Access admin panel
3. Update configuration
4. Create new wheel
5. Force start wheel
6. Monitor game progress

## 🔍 Monitoring and Logging

### Backend Logs
```bash
# Monitor application logs
tail -f logs/app.log

# Monitor error logs
tail -f logs/error.log
```

### Database Monitoring
```sql
-- Monitor active connections
SELECT * FROM pg_stat_activity;

-- Monitor slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Redis Monitoring
```bash
# Monitor Redis operations
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## 📊 Success Criteria

### Functional Requirements
- ✅ Only admins can create wheels
- ✅ Only one active wheel at a time
- ✅ Minimum participant validation
- ✅ Auto-start and manual start functionality
- ✅ Proper elimination sequence
- ✅ Accurate coin distribution
- ✅ Real-time event broadcasting

### Performance Requirements
- ✅ Handle 50+ concurrent users
- ✅ Sub-second response times
- ✅ Zero data loss during failures
- ✅ Graceful error recovery

### Security Requirements
- ✅ Secure authentication
- ✅ Role-based authorization
- ✅ Input validation
- ✅ SQL injection prevention
- ✅ XSS protection

## 🚨 Known Limitations

1. **Horizontal Scaling**: Socket.io requires sticky sessions for multi-instance deployment
2. **Database Locks**: High concurrency may cause temporary lock waits
3. **Memory Usage**: Large elimination sequences stored in memory
4. **Network Partitions**: Temporary disconnections may cause event loss

## 🔧 Troubleshooting

### Common Issues
1. **Socket connection fails**: Check CORS configuration
2. **Database connection timeout**: Verify connection pool settings
3. **Redis connection lost**: Check Redis server status
4. **Configuration not updating**: Clear configuration cache

### Debug Commands
```bash
# Check service status
systemctl status postgresql
systemctl status redis

# Verify database connectivity
psql -h localhost -U username -d roxstar_db -c "SELECT 1;"

# Test Redis connectivity
redis-cli ping
```