# SITEWATCH

## Service Consistency Checker

An automated service monitoring, incident tracking, and email alerting application built with Node.js, Express, MySQL, MongoDB, and Nodemailer.

---

## System Requirements

Before setting up the project, ensure you have the following installed on your system:

* **Node.js**: v18.0.0 or higher


* **npm**: v9.0.0 or higher


* **Docker & Docker Compose** (or Docker Desktop)
* **Google Account**: Required for sending email alerts via Gmail SMTP (with 2-Step Verification enabled)



---

## Installation & Setup Guide

### 1. Clone the Repository

Clone the project repository to your local machine and navigate into the project directory:

```bash
git clone <repository-url>
cd dev-tools

```

---

### 2. Install Dependencies

Install all required Node.js package dependencies:

```bash
npm install

```

---

### 3. Configure Environment Variables

1. Copy `.env.example` to create your local `.env` configuration file:


```bash
cp .env.example .env

```


2. Update `.env` with your actual database credentials and Gmail app details:


```env
# Server Configuration
PORT=3000

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=rootpassword
MYSQL_DATABASE=consistency_checker

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/consistency_checker

# Email Alert Configuration (Gmail SMTP)
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASS=xxxx xxxx xxxx xxxx
ALERT_EMAIL_TO=recipient1@gmail.com, recipient2@example.com

```



---

### 4. Database Setup (Docker Compose)

MySQL and MongoDB run in isolated Docker containers.

#### Start Database Containers

Run the following command in the project root to spin up MySQL and MongoDB:

```bash
docker compose up -d

```

#### What happens automatically:

* **MySQL:** Container starts on port `3306` and initializes the `consistency_checker` database.


* **Automatic Schema Execution:** Docker automatically executes `./schema.sql` on first boot to build the `monitors`, `check_runs`, and `incidents` tables.


* **MongoDB:** Container starts on port `27017`. Mongoose handles collection creation on the first run.



#### Useful Docker Commands

* **Check status:** `docker compose ps`

* **View logs:** `docker compose logs -f`

* **Stop containers:** `docker compose down`

* **Reset database volumes:** `docker compose down -v`


---

### 5. Configure Google App Password for Email Alerts

To enable the application to send automated alert emails:

1. Log into your [Google Account](https://myaccount.google.com/).


2. Navigate to **Security** and verify **2-Step Verification** is turned ON.


3. Open the direct App Passwords page: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).


4. Create a new App Password named `Service Consistency Checker`.


5. Copy the 16-character code into `GMAIL_APP_PASS` in your `.env` file.


6. Set `GMAIL_USER` and `ALERT_EMAIL_TO`.



---

### 6. Reset Test Data (Optional)

To wipe test metrics, logs, or check runs across both MySQL and MongoDB, run the database reset script:

```bash
node reset-db.js

```

---

### 7. Run the Web Application

#### Development Mode (with hot reloading)

```bash
npm run dev

```

#### Production Mode

```bash
npm start

```

Open your browser and navigate to:

```
http://localhost:3000

```

---

## Project Structure Overview

```text
├── public/              # Frontend static files (HTML, CSS, JS)
│   └── index.html       # Clean service management dashboard
├── src/
│   ├── config/          # MySQL pool and MongoDB connection settings
│   ├── models/          # Mongoose models (CheckResult, etc.)
│   └── services/        # Checker worker and email notification logic
├── .env                 # Environment variables with real secrets (git ignored)
├── .env.example         # Environment template for repository
├── .gitignore           # Git ignore rules for secrets and private notes
├── docker-compose.yml   # Docker setup for MySQL & MongoDB
├── schema.sql           # MySQL table initialization script
├── reset-db.js          # Database cleanup utility script
├── server.js            # Express server entry point
└── package.json         # Dependencies and scripts

```