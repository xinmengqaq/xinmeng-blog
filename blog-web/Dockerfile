# 基于官方 nginx 镜像（nginx 程序都自带）
FROM nginx:stable-alpine

# 把本地打包好的 dist 目录 COPY 进镜像的网站根目录
COPY dist/ /usr/share/nginx/html/

# 替换成我们的 nginx 配置（覆盖镜像默认的）
COPY nginx/conf/nginx.conf /etc/nginx/nginx.conf

# 对外暴露端口（容器要监听 80 和 443）
EXPOSE 80 443

# 启动命令（官方镜像默认的，保持默认即可）
CMD ["nginx", "-g", "daemon off;"]
