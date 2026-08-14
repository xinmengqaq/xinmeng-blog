# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /workspace

# 先复制依赖清单，源码变化时可以继续复用依赖安装缓存
COPY package.json package-lock.json ./

RUN --mount=type=cache,target=/root/.npm npm ci

# 在镜像构建阶段编译前端，不依赖宿主机的 node_modules 和 dist
COPY . .

RUN npm run build

# 基于官方 nginx 镜像（nginx 程序都自带）
FROM nginx:stable-alpine

ARG NGINX_CONF=nginx/conf/nginx.conf

# 把构建阶段生成的 dist 目录 COPY 进镜像的网站根目录
COPY --from=build /workspace/dist/ /usr/share/nginx/html/

# 默认使用服务器配置，开源镜像通过 NGINX_CONF 选择通用配置。
COPY ${NGINX_CONF} /etc/nginx/nginx.conf

# 对外暴露端口（容器要监听 80 和 443）
EXPOSE 80 443

# 启动命令（官方镜像默认的，保持默认即可）
CMD ["nginx", "-g", "daemon off;"]
