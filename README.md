# 🚀 SoftShare (软件分享平台)

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?logo=express)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)

A full-stack web application built for sharing software, featuring a modern UI with Radix UI + Tailwind CSS, dark/light mode, internationalization (i18n), and a robust Node.js/SQLite backend.

## ✨ Features

- **📦 Software Catalog**: Browse software by platforms (Windows, macOS, Android) and categories (Dev, System, Download, Media, Productivity, Design).
- **🔍 Search & Pagination**: Default pagination of 20 items per page (customizable to 10/20/50), and full-text search.
- **🔗 URL State Sync**: Filter states (page, category, platform, search) are synchronized with the URL using React Router, enabling easy sharing and refreshing without losing state.
- **📱 Responsive Design**: Fully optimized for mobile devices with a collapsible sidebar (Sheet) and responsive grid layouts.
- **🌗 Theming & 🌐 i18n**: Seamless support for Dark/Light mode and English/Chinese language switching.
- **🔐 Authentication**: Secure user login and registration system using JWT and bcrypt.
- **❤️ Favorites**: Logged-in users can favorite software and view them in a dedicated collection.
- **🛡️ Secure Download**: Users must enter a dynamic verification code (generated via SHA-256 hash) to unlock download links.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM (for URL state management)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **State Management**: Zustand
- **API Client**: Native `fetch` with JWT authorization

### Backend
- **Framework**: Express.js (Node.js) with modular routing (`/auth`, `/software`, `/favorites`)
- **Language**: TypeScript
- **Authentication**: JWT (JSON Web Tokens) + bcryptjs for password hashing
- **Database**: Turso (libSQL) via `@libsql/client` for distributed edge database support.

## 🗄️ Database Schema (Turso / libSQL)

The application uses a Turso (libSQL) database with the following core tables:

1. **`users`**
   - `id`: INTEGER PRIMARY KEY
   - `username`: TEXT UNIQUE
   - `password`: TEXT (Hashed)

2. **`software`**
   - `id`: INTEGER PRIMARY KEY
   - `name`: TEXT
   - `version`: TEXT
   - `platforms`: TEXT (JSON array)
   - `category`: TEXT
   - `size`: TEXT
   - `update_date`: TEXT
   - `description`: TEXT
   - `screenshots`: TEXT (JSON array)
   - `popularity`: INTEGER
   - `download_url`: TEXT

3. **`favorites`**
   - `user_id`: INTEGER
   - `software_id`: INTEGER
   - PRIMARY KEY (`user_id`, `software_id`)

## 📡 API Specification

All API responses follow a unified standard format:
```json
{
  "code": 0, // 0 for success, non-zero for errors
  "message": "success", // Error message or success indicator
  "data": {} // Payload
}
```

### 3.1 鉴权与签名机制 (Server-to-Server)
本系统在向外部 API 发起请求时（或提供给外部调用的受保护接口），会在 HTTP Header 中携带以下鉴权信息：
- `Authorization`: `Bearer <EXTERNAL_API_TOKEN>`
- `x-timestamp`: 发起请求时的毫秒级时间戳 (例如 `1716192000000`)
- `x-signature`: 使用 HMAC-SHA256 算法，以 `EXTERNAL_API_TOKEN` 为密钥，对 `x-timestamp` 进行哈希计算得到的十六进制字符串。

*外部 API 应当校验时间戳是否过期（如误差在 5 分钟内），并重新计算签名进行比对，以防止重放攻击和伪造请求。*

*(Note: Standard user authentication from the frontend uses standard JWT tokens passed via the `Authorization: Bearer <token>` header).*

### Key Endpoints
- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Login and receive a JWT.
- `GET /api/software`: Get paginated software list with optional filters (`search`, `category`, `platform`).
- `GET /api/software/:id/hint`: Get the dynamic verification code hint for a specific software.
- `POST /api/software/:id/download`: Verify code and get the secure download URL.
- `GET /api/favorites`: Get user's favorite software (Requires Auth).
- `POST /api/favorites`: Toggle favorite status (Requires Auth).

## 🔑 Verification Code Logic

To download a software, users must enter a daily dynamic verification code. The code is securely generated on the backend using a combination of the software ID, the current date, and a server secret key.

**Generation Steps:**
1. Format current date as `YYYY-MM-DD`.
2. Concatenate: `${id}-${dateStr}-${SECRET_KEY}`.
3. Hash the string using **SHA-256**.
4. Extract the first 6 characters of the hex digest and convert them to uppercase.

```typescript
function getVerificationCode(id: number): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const str = `${id}-${dateStr}-${process.env.SECRET_KEY}`;
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 6).toUpperCase();
}
```
*(In the UI, a hint is automatically fetched and provided for testing purposes).*

## 🚀 Deployment Process

### 1. Prerequisites
- Node.js (v18 or higher)
- npm, pnpm, or yarn

### 2. Environment Variables
Create a `.env` file in the root directory (optional, defaults are provided in code):
```env
# Authentication & Signature Secrets
JWT_SECRET="your_jwt_secret_key"
SECRET_KEY="your_download_verification_secret_key"
EXTERNAL_API_TOKEN="your_external_api_token"

# Turso Database Configuration
TURSO_DATABASE_URL="libsql://mydb-xxx.aws-ap-northeast-1.turso.io"
TURSO_AUTH_TOKEN="your_turso_auth_token"
```

### 3. Build the Application
The application is set up as a full-stack Vite + Express app. The build process compiles the React frontend into static files and the Express backend into a Node.js script.

```bash
# Install dependencies
npm install

# Build frontend and backend
npm run build
```

### 4. Run in Production
After building, the compiled assets will be in the `dist` folder. The Express server will serve the API routes and the static frontend files.

```bash
# Start the production server
npm run start
```
By default, the server runs on port `3000`.

### 5. Database Persistence
The application uses Turso (libSQL) as a distributed edge database. If the `TURSO_DATABASE_URL` is not provided, it will gracefully fallback to a local SQLite file (`data.db`) for development purposes.
