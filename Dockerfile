# 第一阶段：构建阶段
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖定义文件
COPY package*.json ./

# 安装所有依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制项目源代码
COPY . .

# 执行构建（生成 dist 目录）
RUN npm run build

# 第二阶段：运行阶段
FROM node:22-alpine

WORKDIR /app

# 创建数据目录，用于持久化 SQLite 数据库
RUN mkdir -p /app/data

# 仅复制生产环境运行所需的文件
COPY package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/server ./server

# 如果构建阶段有初始数据库，将其复制到数据目录中
# 这样首次启动时就会包含预设的软件数据
COPY --from=builder /app/data.db ./data/data.db

# 安装生产环境依赖
RUN npm ci --omit=dev

# 安装 tsx 用于在生产环境直接运行 server.ts
# Node 22 虽然原生支持 TypeScript，但 tsx 在处理复杂的模块导入时更加稳健
RUN npm install -g tsx

# 暴露应用端口
EXPOSE 3000

# 设置生产环境标识
ENV NODE_ENV=production

# 启动命令
CMD ["tsx", "server.ts"]