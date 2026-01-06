#!/bin/bash

# ==========================================
# CBMS 一键部署与配置脚本
# ==========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 读取用户输入，支持默认值
read_input() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    local input_val # 使用局部变量防止污染

    if [ -n "$default" ]; then
        echo -ne "${YELLOW}$prompt [${default}]: ${NC}"
        read input_val
        if [ -z "$input_val" ]; then
            eval $var_name="\$default"
        else
            eval $var_name="\$input_val"
        fi
    else
        echo -ne "${YELLOW}$prompt: ${NC}"
        read input_val
        eval $var_name="\$input_val"
    fi
}



# 4. 生成配置文件
info "正在生成 .env 配置文件..."

# 欢迎语
clear
echo -e "${GREEN}"
echo "=================================================="
echo "      CBMS (Cell Bank Management System)          "
echo "           交互式部署配置向导                     "
echo "=================================================="
echo -e "${NC}"

# 1. 环境检查
info "正在检查运行环境..."

# 检查 npm
if ! command -v npm &> /dev/null; then
    error "未检测到 npm (通常随 Node.js 一起安装)"
    echo -e "${YELLOW}>>> 安装提示 (WSL/Linux):${NC}"
    echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    echo "source ~/.bashrc && nvm install --lts"
    exit 1
else
    success "检测到 npm"
fi

# 检查 pnpm
if ! command -v pnpm &> /dev/null; then
    warn "未检测到 pnpm，正在尝试通过 npm 自动安装..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        error "pnpm 自动安装失败"
        echo -e "${YELLOW}>>> 请手动安装:${NC}"
        echo "npm install -g pnpm"
        exit 1
    fi
    success "pnpm 安装成功"
else
    success "检测到 pnpm"
fi

# 检查 PostgreSQL (可选警告，因为可能用 Docker)
if ! command -v psql &> /dev/null; then
    warn "未检测到 PostgreSQL 客户端 (psql)"
    echo -e "${YELLOW}>>> 如果您不使用 Docker，请安装:${NC}"
    echo "sudo apt update && sudo apt install postgresql postgresql-contrib"
    echo -e "${BLUE}[提示] 如果您使用 Docker 运行数据库，可忽略此警告${NC}"
else
    success "检测到 PostgreSQL 客户端"
fi

# 检查 Redis (可选警告，因为可能用 Docker)
if ! command -v redis-cli &> /dev/null; then
    warn "未检测到 Redis 客户端 (redis-cli)"
    echo -e "${YELLOW}>>> 如果您不使用 Docker，请安装:${NC}"
    echo "sudo apt install redis-server"
    echo -e "${BLUE}[提示] 如果您使用 Docker 运行 Redis，可忽略此警告${NC}"
else
    success "检测到 Redis 客户端"
fi

success "基础环境检查完成"
echo ""

# 2. 交互式配置
info "请根据提示输入配置信息 (按回车使用默认值)"
echo ""

# --- 数据库配置 ---
echo "--- 🐘 PostgreSQL 数据库配置 ---"
read_input "数据库主机 (Host)" "localhost" DB_HOST
read_input "数据库端口 (Port)" "5432" DB_PORT
read_input "数据库用户名 (User)" "postgres" DB_USER
read_input "数据库密码 (Password)" "postgres" DB_PASSWORD
read_input "数据库名称 (Database Name)" "cbms" DB_NAME

DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"
echo ""

# --- Redis 配置 ---
echo "--- 🔴 Redis 缓存配置 (可选) ---"
read_input "是否启用 Redis? (y/n)" "y" ENABLE_REDIS

if [[ "$ENABLE_REDIS" =~ ^[Yy]$ ]]; then
    read_input "Redis 主机 (Host)" "localhost" REDIS_HOST
    read_input "Redis 端口 (Port)" "6379" REDIS_PORT
    read_input "Redis 密码 (留空则无密码)" "" REDIS_PASSWORD
    
    if [ -n "$REDIS_PASSWORD" ]; then
        REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
    else
        REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
    fi
else
    warn "已跳过 Redis 配置，系统将运行在无缓存模式"
    REDIS_URL=""
fi
echo ""

# --- 认证配置 ---
echo "--- 🛡️ 认证与安全配置 ---"
read_input "应用部署 URL (NEXTAUTH_URL)" "http://localhost:3000" APP_URL

info "正在生成候选 NextAuth Secret..."
if command -v openssl &> /dev/null; then
    AUTO_SECRET=$(openssl rand -base64 32)
else
    AUTO_SECRET="cbms-secret-$(date +%s%N | sha256sum | head -c 32)"
fi
echo -e "生成的随机密钥: ${GREEN}${AUTO_SECRET}${NC}"

read_input "是否使用此密钥? (y/n)" "y" CONFIRM_SECRET
if [[ "$CONFIRM_SECRET" =~ ^[Yy]$ ]]; then
    NEXTAUTH_SECRET="$AUTO_SECRET"
else
    read_input "请输入您的 NextAuth Secret (至少32位字符)" "" NEXTAUTH_SECRET
fi
echo ""

# --- 管理员初始化 ---
echo "--- 🔑 初始管理员账户设置 ---"
read_input "管理员账号 (工号)" "admin" ADMIN_ID
# 生成一个随即密码作为建议值
RANDOM_PWD=$(openssl rand -base64 12)
read_input "管理员密码" "$RANDOM_PWD" ADMIN_PWD
read_input "管理员邮箱" "admin@cbms.local" ADMIN_EMAIL
echo ""

# --- 高级安全配置 ---
echo "--- 🔐 高级安全配置 ---"
info "配置用于敏感操作（如重置用户密码）的超级密钥"
read_input "超级管理员密码" "ssyf2026" SUPER_PWD
echo ""

# 3. 配置汇总与确认
echo ""
echo "=================================================="
echo "=================================================="
echo "               配置汇总确认                       "
echo "=================================================="
echo "[Database]"
echo "  - Host: ${DB_HOST}:${DB_PORT}"
echo "  - Name: ${DB_NAME}"
echo "  - User: ${DB_USER}"
echo "  - Pass: ${DB_PASSWORD}"
echo ""
echo "[Redis]"
if [[ "$ENABLE_REDIS" =~ ^[Yy]$ ]]; then
    echo "  - Status: 已启用"
    echo "  - Host:   ${REDIS_HOST}:${REDIS_PORT}"
    echo "  - Pass:   ${REDIS_PASSWORD:-<无>}"
else
    echo "  - Status: 未启用"
fi
echo ""
echo "[App & Auth]"
echo "  - URL:    ${APP_URL}"
echo "  - Secret: ${NEXTAUTH_SECRET:0:10}..."
echo ""
echo "[Admin Initial]"
echo "  - ID:     ${ADMIN_ID}"
echo "  - Email:  ${ADMIN_EMAIL}"
echo "  - Pass:   ${ADMIN_PWD}"
echo ""
echo "[Security]"
echo "  - SuperPWD: ${SUPER_PWD}"
echo "=================================================="
read_input "确认以上配置并生成文件? (y/n)" "y" CONFIRM_CONFIG

if [[ ! "$CONFIRM_CONFIG" =~ ^[Yy]$ ]]; then
    warn "已取消操作"
    exit 0
fi

# 4. 生成配置文件
info "正在生成 .env 配置文件..."

if [ -f .env ]; then
    warn "检测到现有的 .env 文件，已备份为 .env.bak"
    cp .env .env.bak
fi

cat > .env <<EOL
# Generated by deploy.sh
# ======================

# Database
DATABASE_URL="${DB_URL}"

# Redis
${REDIS_URL:+REDIS_URL="${REDIS_URL}"}

# NextAuth
NEXTAUTH_URL="${APP_URL}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Init Seed
ADMIN_EMPLOYEE_ID="${ADMIN_ID}"
ADMIN_PASSWORD="${ADMIN_PWD}"
ADMIN_EMAIL="${ADMIN_EMAIL}"

# Super Admin
ADMIN_SUPER_PASSWORD="${SUPER_PWD}"
EOL

success ".env 配置文件生成成功"
echo ""

# 4. 安装与构建
read_input "是否立即开始安装依赖并构建项目? (y/n)" "y" START_INSTALL

if [[ "$START_INSTALL" =~ ^[Yy]$ ]]; then
    info "STEP 1/5: 安装项目依赖..."
    pnpm install
    
    info "STEP 2/5: 同步数据库结构..."
    pnpm db:push
    
    info "STEP 3/5: 初始化预设数据..."
    pnpm db:seed
    
    # 清理 Redis 缓存 (如果启用了 Redis)
    if [[ "$ENABLE_REDIS" =~ ^[Yy]$ ]] && command -v redis-cli &> /dev/null; then
        info "STEP 4/5: 清理 Redis 缓存..."
        redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} KEYS "cbms:*" | xargs -r redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ${REDIS_PASSWORD:+-a "$REDIS_PASSWORD"} DEL 2>/dev/null || warn "Redis 缓存清理跳过（可能未运行）"
        success "Redis 缓存已清理"
    else
        info "STEP 4/5: 跳过 Redis 缓存清理 (未启用或未安装 redis-cli)"
    fi
    
    info "STEP 5/5: 构建生产版本..."
    pnpm build
    
    echo ""
    echo "=================================================="
    success "🎉 部署准备完成！"
    echo "=================================================="
    echo "您可以执行以下命令启动服务："
    echo -e "${YELLOW}pnpm start${NC}"
    echo ""
else
    success "配置已保存。请稍后手动运行: pnpm install && pnpm build"
fi
