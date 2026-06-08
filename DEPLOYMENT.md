# Jasmine Music Player 部署上线记录

本文档记录本项目部署到阿里云 VPS 和自定义域名的完整过程，方便以后复现或排查问题。

## 当前线上信息

- 域名：`jasminezhr.me`
- 服务器公网 IP：`120.26.174.241`
- 系统：Ubuntu 24.04 LTS
- Web 根目录：`/var/www/music-player`
- 前端服务：Nginx 静态文件
- 后端 API：`NeteaseCloudMusicApi`，本机监听 `127.0.0.1:3000`
- SSH 端口：`2222`
- HTTPS：Let's Encrypt + Certbot

## 1. 域名解析

在域名服务商处添加 DNS 记录：

| 类型 | 主机记录 | 记录值 | 说明 |
| --- | --- | --- | --- |
| A | `@` | `120.26.174.241` | 根域名 `jasminezhr.me` |
| A | `www` | `120.26.174.241` | `www.jasminezhr.me` |

注意：

- 如果之前有指向 GitHub Pages 的 A 记录，例如 `185.199.xxx.xxx`，需要删除。
- 如果有 `www -> jasminezhr.me` 的 CNAME 也可以保留，但当前部署使用 A 记录更直接。
- DNS 生效需要等待几分钟到几十分钟。

## 2. 阿里云安全组

在阿里云 ECS 或轻量应用服务器控制台放行：

| 端口 | 协议 | 来源 | 用途 |
| --- | --- | --- | --- |
| 80 | TCP | `0.0.0.0/0` | HTTP，Certbot 验证和跳转 HTTPS |
| 443 | TCP | `0.0.0.0/0` | HTTPS |
| 2222 | TCP | 建议改成自己的公网 IP | SSH 管理 |

如果要保留默认 SSH，也可以临时放行 `22`，但不建议长期对公网开放。

## 3. SSH 端口配置

服务器上编辑 SSH 配置：

```bash
sudo nano /etc/ssh/sshd_config
```

加入或确认以下配置：

```text
PermitRootLogin yes
PasswordAuthentication yes
Port 22
Port 2222
```

Ubuntu 24.04 可能启用了 `ssh.socket`，它会覆盖 `sshd_config` 里的端口监听。需要关闭 socket 激活：

```bash
sudo systemctl disable --now ssh.socket
sudo systemctl restart ssh
sudo ss -ltnp | grep ssh
```

看到 `0.0.0.0:2222` 和 `[::]:2222` 就说明 2222 已经监听。

本地连接命令：

```bash
ssh -p 2222 root@120.26.174.241
```

## 4. 安装服务器依赖

SSH 登录服务器后安装基础组件：

```bash
sudo apt update
sudo apt install -y nginx nodejs npm certbot python3-certbot-nginx
```

创建前端目录：

```bash
sudo mkdir -p /var/www/music-player
sudo chown -R root:root /var/www/music-player
```

创建 API 目录：

```bash
sudo mkdir -p /opt/jasmine-api
```

## 5. 部署网易云 API 服务

API 服务运行在服务器本机 `127.0.0.1:3000`，只给 Nginx 反向代理访问，不直接暴露公网端口。

在服务器上：

```bash
cd /opt/jasmine-api
npm init -y
npm install NeteaseCloudMusicApi@4.31.0
```

把本项目的 `scripts/start-ncm-api.cjs` 上传到服务器：

```bash
scp -P 2222 scripts/start-ncm-api.cjs root@120.26.174.241:/opt/jasmine-api/start-ncm-api.cjs
```

创建 systemd 服务：

```bash
sudo nano /etc/systemd/system/jasmine-ncm-api.service
```

写入：

```ini
[Unit]
Description=Jasmine Netease Cloud Music API
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/jasmine-api
ExecStart=/usr/bin/node /opt/jasmine-api/start-ncm-api.cjs
Restart=always
RestartSec=3
Environment=HOST=127.0.0.1
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now jasmine-ncm-api
sudo systemctl status jasmine-ncm-api --no-pager
```

检查端口：

```bash
ss -ltnp | grep :3000
```

查看日志：

```bash
journalctl -u jasmine-ncm-api -n 100 --no-pager
```

## 6. Nginx 配置

创建站点配置：

```bash
sudo nano /etc/nginx/sites-available/music-player
```

基础 HTTP 配置：

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name jasminezhr.me www.jasminezhr.me;
    root /var/www/music-player;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/music-player /etc/nginx/sites-enabled/music-player
sudo nginx -t
sudo systemctl reload nginx
```

## 7. 配置 HTTPS

确认域名已经解析到服务器后执行：

```bash
sudo certbot --nginx -d jasminezhr.me -d www.jasminezhr.me
```

Certbot 会自动修改 Nginx 配置，加入 443 HTTPS 和 HTTP 跳转 HTTPS。

检查自动续期：

```bash
sudo certbot renew --dry-run
```

## 8. 本地构建前端

本项目 `vite.config.ts` 默认 base 是 `/music-player/`，这是给 GitHub Pages 用的。

部署到独立域名根路径时，必须使用：

```bash
VITE_BASE_PATH=/ npm run build
```

否则线上 HTML 会引用 `/music-player/assets/...`，导致独立域名页面空白。

构建成功后产物在：

```text
dist/
```

## 9. 上传前端产物

从本地项目根目录执行：

```bash
scp -P 2222 -r dist/* root@120.26.174.241:/var/www/music-player/
```

上传后确认线上 HTML 引用的是 `/assets/...`：

```bash
curl -sS https://jasminezhr.me/ | grep assets
```

正确示例：

```html
<script type="module" crossorigin src="/assets/index-xxxx.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-xxxx.css">
```

错误示例：

```html
<script type="module" crossorigin src="/music-player/assets/index-xxxx.js"></script>
```

如果看到错误示例，重新用 `VITE_BASE_PATH=/ npm run build` 构建并上传。

## 10. 验证接口和页面

检查首页：

```bash
curl -I https://jasminezhr.me/
```

检查 API 反代：

```bash
curl -sS https://jasminezhr.me/api/search/hot/detail
```

检查二维码登录请求日志：

```bash
ssh -p 2222 root@120.26.174.241
journalctl -u jasmine-ncm-api -n 100 --no-pager | grep "/login/qr"
```

当前二维码登录检查接口应包含：

```text
noCookie=true
timestamp=
```

示例：

```text
/login/qr/check?key=...&noCookie=true&timestamp=...
```

## 11. 常见问题

### 127.0.0.1 拒绝连接

`127.0.0.1` 只代表自己电脑。朋友访问你的本地服务不能用 `127.0.0.1`，需要部署到公网服务器并使用公网 IP 或域名。

### SSH 2222 没有监听

检查：

```bash
sudo ss -ltnp | grep ssh
systemctl status ssh.socket
```

如果 `ssh.socket` 只监听 22，执行：

```bash
sudo systemctl disable --now ssh.socket
sudo systemctl restart ssh
```

### 阿里云安全组端口范围报错

端口范围填写单个端口时，不要写成错误格式。常见写法：

```text
2222
```

或根据控制台要求填写：

```text
2222/2222
```

如果控制台报 `InvalidPort.ValueNotSupported`，优先尝试只填 `2222`。

### 页面打开还是 GitHub Pages 风格

通常是 DNS 还指向 GitHub Pages，删除这些 A 记录：

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

保留指向 VPS 的：

```text
120.26.174.241
```

### 页面空白

优先检查构建路径：

```bash
curl -sS https://jasminezhr.me/ | grep assets
```

如果资源路径是 `/music-player/assets/...`，重新构建：

```bash
VITE_BASE_PATH=/ npm run build
scp -P 2222 -r dist/* root@120.26.174.241:/var/www/music-player/
```

### API 服务异常

查看服务状态：

```bash
systemctl status jasmine-ncm-api --no-pager
```

查看日志：

```bash
journalctl -u jasmine-ncm-api -n 100 --no-pager
```

重启：

```bash
sudo systemctl restart jasmine-ncm-api
```

## 12. 每次更新上线的最短流程

本地：

```bash
VITE_BASE_PATH=/ npm run build
scp -P 2222 -r dist/* root@120.26.174.241:/var/www/music-player/
```

线上验证：

```bash
curl -I https://jasminezhr.me/
curl -sS https://jasminezhr.me/ | grep assets
```

如果 API 脚本也改了：

```bash
scp -P 2222 scripts/start-ncm-api.cjs root@120.26.174.241:/opt/jasmine-api/start-ncm-api.cjs
ssh -p 2222 root@120.26.174.241
sudo systemctl restart jasmine-ncm-api
sudo systemctl status jasmine-ncm-api --no-pager
```
