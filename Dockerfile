# Galgame Toolkit Docker镜像构建
# 基础镜像：node:20-slim（包含Sharp所需的libvips）

FROM node:20-slim

WORKDIR /app

# 安装ffmpeg（音频处理工具依赖）
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 复制依赖声明文件
COPY package.json package-lock.json* ./

# 安装生产依赖
RUN npm ci --only=production

# 复制Prisma相关文件
COPY prisma ./prisma/

# 生成Prisma客户端
RUN npx prisma generate

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p data/uploads/images data/uploads/audio data/uploads/projects data/exports

# 构建Next.js应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 设置环境变量默认值
ENV DATABASE_URL="file:./data/galgame_toolkit.db"
ENV JWT_SECRET="default-secret-change-in-production"
ENV PORT=3000

# 启动服务
CMD ["npm", "start"]
