# ROXSTAR - Multiplayer Spin Wheel Game

Welcome to ROXSTAR! This is a real-time multiplayer spin wheel game where players pay coins to join a game, watch a spinning wheel eliminate players one by one, and see the last person standing win a huge prize!

## 🎮 How the Game Works (Simple Flow)
1. **Create Game (Admin Only):** An Admin creates a new Spin Wheel Game. (There can only be one active game at a time!)
2. **Players Join:** Users can join the game by paying an Entry Fee using their coins.
3. **Game Starts:** The game automatically starts after 3 minutes, OR the Admin can start it early. (A minimum of 3 players is needed. If less than 3 players join, the game is canceled and everyone gets a refund).
4. **The Wheel Spins:** Every 7 seconds, the wheel spins and eliminates one player at random.
5. **Winner Takes All:** The last player remaining wins the game! The total entry fees collected are split: the winner gets a huge cut, the Admin gets a cut, and the App keeps a small fee.

## 👥 Default Players for Testing
To make it super easy to understand the game flow without creating multiple accounts yourself, we have added **pre-created default players** with coins ready to play! 

You can log in using any of these accounts (Password for all of them is: `password123`):

**Admin Account (Can create the games):**
- Email: `admin@roxstar.com`
- Coins: 10,000

**Player Accounts (Can join the games):**
- Email: `player1@roxstar.com`
- Email: `player2@roxstar.com`
- Email: `player3@roxstar.com`
- Email: `player4@roxstar.com`
- Email: `player5@roxstar.com`
- Coins: 1,000 each

### How to test the flow:
1. Log in as `admin@roxstar.com` and create a wheel.
2. Open 3 new "Incognito" or "Private" browser windows.
3. Log in as `player1@roxstar.com`, `player2@roxstar.com`, and `player3@roxstar.com` in those windows.
4. Have all 3 players join the wheel.
5. Wait for the game to start (or force start it as the Admin). Watch the players get eliminated in real-time until one wins!

## 🚀 How to Run the Project Locally

### 1. Start the Backend API
1. Open your terminal and go to the `backend` folder: `cd backend`
2. Install dependencies: `npm install`
3. Push the database schema to your Postgres DB: `npm run prisma:push`
4. **Seed the database (IMPORTANT):** Run this to add the default players and configuration:
   `npm run seed:config`
5. Start the server: `npm run dev`

*(Make sure you have your `.env` file set up with a PostgreSQL URL and a Redis URL before running!)*

### 2. Start the Frontend App
1. Open a new terminal window and go to the `frontend` folder: `cd frontend`
2. Install dependencies: `npm install`
3. Start the website: `npm run dev`

### 3. Play!
- The website is now running at `http://localhost:3000`.
- The backend API is running at `http://localhost:4000`.

## ⚙️ How the Tech Works Under the Hood
This project is built to handle many players safely and fairly.
- **Database (PostgreSQL & Prisma):** When someone joins a game, the system uses a "database lock" to make sure their coins are deducted perfectly, even if they click "Join" 100 times in one second. 
- **Real-Time (Socket.io):** When a player is eliminated or when someone wins, the server instantly sends a message to everyone's screen so they see the wheel update without refreshing the page.
- **Background Tasks (Redis & BullMQ):** The 3-minute game timers and the 7-second elimination ticks are handled safely by a background queue system. Even if the server restarts, the timers aren't lost!
- **Automated Tests:** We have automated test scripts (Jest) written to prove that the coin deduction and prize distribution math works perfectly every time.