#!/bin/bash

# Danny Game Prerequisites Checker
# Перевіряє готовність системи до деплойменту

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="dannyvshaters.xyz"
REQUIRED_PORTS=(22 80 443)
REQUIRED_COMMANDS=(curl wget git)

echo -e "${BLUE}🔍 Danny Game Prerequisites Checker${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check command exists
check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $description: Found ($cmd)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ $description: Not found${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check port availability
check_port() {
    local port=$1
    
    if ss -tulpn | grep -q ":$port "; then
        echo -e "${YELLOW}⚠️  Port $port: In use${NC}"
        ((WARNINGS++))
        return 1
    else
        echo -e "${GREEN}✅ Port $port: Available${NC}"
        ((PASSED++))
        return 0
    fi
}

# Function to check disk space
check_disk_space() {
    local required_gb=$1
    local available_gb=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    
    if [ "$available_gb" -ge "$required_gb" ]; then
        echo -e "${GREEN}✅ Disk space: ${available_gb}GB available (${required_gb}GB required)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ Disk space: ${available_gb}GB available (${required_gb}GB required)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check memory
check_memory() {
    local required_mb=$1
    local available_mb=$(free -m | awk 'NR==2{print $7}')
    
    if [ "$available_mb" -ge "$required_mb" ]; then
        echo -e "${GREEN}✅ Memory: ${available_mb}MB available (${required_mb}MB required)${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ Memory: ${available_mb}MB available (${required_mb}MB required)${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check domain DNS
check_domain_dns() {
    local domain=$1
    
    echo -e "${YELLOW}🌐 Checking DNS for $domain...${NC}"
    
    if ping -c 1 "$domain" >/dev/null 2>&1; then
        local ip=$(ping -c 1 "$domain" | grep -oP '\(\K[^)]+' | head -1)
        echo -e "${GREEN}✅ DNS: $domain resolves to $ip${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ DNS: $domain does not resolve${NC}"
        echo -e "${YELLOW}   Please configure DNS A record to point to this server's IP${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check internet connectivity
check_internet() {
    echo -e "${YELLOW}🌍 Checking internet connectivity...${NC}"
    
    if curl -s --connect-timeout 5 https://google.com >/dev/null; then
        echo -e "${GREEN}✅ Internet: Connected${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ Internet: No connection${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check sudo access
check_sudo() {
    echo -e "${YELLOW}🔐 Checking sudo access...${NC}"
    
    if sudo -n true 2>/dev/null; then
        echo -e "${GREEN}✅ Sudo: Passwordless access available${NC}"
        ((PASSED++))
        return 0
    elif sudo -v 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Sudo: Password required${NC}"
        ((WARNINGS++))
        return 1
    else
        echo -e "${RED}❌ Sudo: No access${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check OS compatibility
check_os() {
    echo -e "${YELLOW}💻 Checking operating system...${NC}"
    
    if [ -f /etc/os-release ]; then
        source /etc/os-release
        case "$ID" in
            ubuntu|debian)
                echo -e "${GREEN}✅ OS: $PRETTY_NAME (Supported)${NC}"
                ((PASSED++))
                return 0
                ;;
            centos|rhel|fedora)
                echo -e "${YELLOW}⚠️  OS: $PRETTY_NAME (May work with modifications)${NC}"
                ((WARNINGS++))
                return 1
                ;;
            *)
                echo -e "${RED}❌ OS: $PRETTY_NAME (Not tested)${NC}"
                ((FAILED++))
                return 1
                ;;
        esac
    else
        echo -e "${RED}❌ OS: Cannot determine operating system${NC}"
        ((FAILED++))
        return 1
    fi
}

# Function to check user permissions
check_user() {
    echo -e "${YELLOW}👤 Checking user permissions...${NC}"
    
    if [ "$EUID" -eq 0 ]; then
        echo -e "${RED}❌ User: Running as root (not recommended)${NC}"
        ((FAILED++))
        return 1
    else
        echo -e "${GREEN}✅ User: Running as non-root user ($USER)${NC}"
        ((PASSED++))
        return 0
    fi
}

# Function to check firewall status
check_firewall() {
    echo -e "${YELLOW}🔥 Checking firewall status...${NC}"
    
    if command -v ufw >/dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            echo -e "${GREEN}✅ Firewall: UFW is active${NC}"
            ((PASSED++))
        else
            echo -e "${YELLOW}⚠️  Firewall: UFW is installed but inactive${NC}"
            ((WARNINGS++))
        fi
    else
        echo -e "${YELLOW}⚠️  Firewall: UFW not installed${NC}"
        ((WARNINGS++))
    fi
}

# Main checks
echo -e "${BLUE}📋 System Requirements${NC}"
echo -e "${BLUE}=====================${NC}"

# OS and user checks
check_os
check_user
check_sudo

# System resources
echo ""
echo -e "${BLUE}💾 System Resources${NC}"
echo -e "${BLUE}===================${NC}"
check_disk_space 5  # 5GB required
check_memory 1024   # 1GB required

# Network checks
echo ""
echo -e "${BLUE}🌐 Network Configuration${NC}"
echo -e "${BLUE}========================${NC}"
check_internet
check_domain_dns "$DOMAIN"

# Port availability
echo ""
echo -e "${BLUE}🔌 Port Availability${NC}"
echo -e "${BLUE}====================${NC}"
for port in "${REQUIRED_PORTS[@]}"; do
    check_port "$port"
done

# Required commands
echo ""
echo -e "${BLUE}🛠️  Required Commands${NC}"
echo -e "${BLUE}=====================${NC}"
for cmd in "${REQUIRED_COMMANDS[@]}"; do
    check_command "$cmd" "$cmd"
done

# Development tools
echo ""
echo -e "${BLUE}🔧 Development Tools${NC}"
echo -e "${BLUE}====================${NC}"
check_command "rustc" "Rust compiler"
check_command "cargo" "Cargo package manager"
check_command "node" "Node.js"
check_command "npm" "NPM package manager"
check_command "linera" "Linera CLI"

# Security checks
echo ""
echo -e "${BLUE}🔐 Security${NC}"
echo -e "${BLUE}===========${NC}"
check_firewall

# Summary
echo ""
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}==========${NC}"
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo ""

# Recommendations
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}🚨 Critical Issues Found${NC}"
    echo -e "${RED}========================${NC}"
    echo "Please resolve the failed checks before proceeding with deployment."
    echo ""
    echo -e "${YELLOW}Common solutions:${NC}"
    echo "• Install missing commands: sudo apt update && sudo apt install curl wget git"
    echo "• Configure DNS: Point $DOMAIN A record to this server's IP"
    echo "• Free up disk space: sudo apt autoremove && sudo apt autoclean"
    echo "• Add more memory: Upgrade server or add swap"
    echo "• Stop conflicting services: sudo systemctl stop <service>"
    echo ""
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Warnings Found${NC}"
    echo -e "${YELLOW}==================${NC}"
    echo "Deployment may proceed, but consider addressing warnings for optimal performance."
    echo ""
    echo -e "${YELLOW}Recommendations:${NC}"
    echo "• Install UFW firewall: sudo apt install ufw"
    echo "• Configure passwordless sudo for automation"
    echo "• Stop services using required ports"
    echo ""
    exit 0
else
    echo -e "${GREEN}🎉 All Checks Passed!${NC}"
    echo -e "${GREEN}=====================${NC}"
    echo "Your system is ready for Danny Game deployment."
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Run: ./deploy-production.sh"
    echo "2. Wait for deployment to complete"
    echo "3. Access your game at: https://$DOMAIN"
    echo ""
    exit 0
fi