# 🚀 SoftShare

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

A full-stack web application built for sharing, discovering, and downloading software. It features a modern UI with Shadcn UI + Tailwind CSS, dark/light mode, internationalization (i18n), real-time notifications, AI-powered recommendations, and a robust Node.js backend.

## ✨ Key Features

- **📦 Software Catalog**: Browse software by platforms (Windows, macOS, Android) and categories. Includes detailed pages with screenshots, tutorials, and version history.
- **🤖 AI Integration**: Built-in AI Assistant for software recommendations and AI-generated summaries for software details. Supports multiple providers (Google Gemini, OpenAI, Qwen, Custom).
- **🔔 Real-time Notifications**: WebSocket-powered real-time notifications for updates, submission status, and system alerts.
- **🌐 Internationalization (i18n)**: Seamless support for English and Chinese language switching across the entire application.
- **🌗 Theming**: Smooth Dark/Light mode transitions with FOUC (Flash of Unstyled Content) prevention.
- **🔐 Authentication & User Center**: Secure user login/registration (JWT + bcrypt). Users can manage profiles, view download history, favorite software, and track submissions.
- **🛡️ Admin Dashboard**: Comprehensive admin panel to manage software, collections, categories, tags, user roles, and review software submissions.
- **🔗 URL State Sync**: Filter states (category, platform, search) are synchronized with the URL, enabling easy sharing.
- **📱 Responsive Design**: Fully optimized for mobile devices with a collapsible sidebar and responsive grid layouts.
- **🚦 Rate Limiting**: Built-in API rate limiting to prevent abuse and ensure service stability.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **State Management**: Zustand
- **Data Fetching**: React Query (`@tanstack/react-query`)
- **Real-time**: Socket.io-client
- **Animations**: Framer Motion

### Backend
- **Framework**: Express.js (Node.js)
- **Language**: TypeScript
- **Database**: SQLite (via `better-sqlite3`)
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs
- **Security**: `express-rate-limit`

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- npm

### 2. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:

```env
# Authentication Secrets
JWT_SECRET="your_jwt_secret_key"
SECRET_KEY="your_download_verification_secret_key"

# AI Configuration (Optional, defaults to Gemini if provided)
GEMINI_API_KEY="your_gemini_api_key"

# Database Configuration
DB_TYPE="sqlite"
SQLITE_URL="data.db"
```

### 3. Installation & Running

```bash
# Install dependencies
npm install

# Start the development server (Frontend + Backend concurrently)
npm run dev
```
The application will be available at `http://localhost:3000`.

### 4. Build for Production

```bash
# Build frontend and backend
npm run build

# Start the production server
npm run start
```

## 🗄️ Database Schema Overview

The application uses SQLite with the following core tables:
- `users`: User accounts, roles (admin/user), and profiles.
- `software`: Software details, download links, metadata.
- `categories` & `tags`: Organization and filtering.
- `collections`: Curated groups of software.
- `favorites`: User favorite relationships.
- `download_history`: Tracks user downloads.
- `submissions`: User-submitted software awaiting admin review.
- `comments`: User reviews and ratings for software.
- `notifications`: System and user-specific alerts.

## 📡 API Specification

All API responses follow a unified standard format:
```json
{
  "code": 0, // 0 for success, non-zero for errors
  "message": "success", // Error message or success indicator
  "data": {} // Payload
}
```

## 🔑 Verification Code Logic

To download a software, users must enter a daily dynamic verification code. The code is securely generated on the backend using a combination of the software ID, the current date, and a server secret key.

**Generation Steps:**
1. Format current date as `YYYY-MM-DD`.
2. Concatenate: `${id}-${dateStr}-${SECRET_KEY}`.
3. Hash the string using **SHA-256**.
4. Extract the first 6 characters of the hex digest and convert them to uppercase.

*(In the UI, a hint is automatically fetched and provided for testing purposes).*

## 📄 License
All rights reserved.
