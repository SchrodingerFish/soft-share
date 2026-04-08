# 第一阶段：构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖定义文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制项目源代码
COPY . .

# 执行构建（生成前端静态文件到 dist 目录）
RUN npm run build

# 第二阶段：运行阶段
FROM node:22-alpine

WORKDIR /app

# 仅复制生产环境运行所需的文件
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/data.db ./data.db

# 安装生产环境依赖
RUN npm ci --omit=dev

# 安装 tsx 用于在生产环境运行 server.ts
RUN npm install -g tsx

# 暴露应用端口
EXPOSE 3000

# 设置生产环境标识
ENV NODE_ENV=production

# 启动命令
CMD ["tsx", "server.ts"]