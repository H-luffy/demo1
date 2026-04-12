# ============================================
# 轻量级管理员系统 - 快速启动脚本
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  课表模板系统 - 管理员模式启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .env 文件中的管理员密码配置
$envFile = "backend\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "ADMIN_PASSWORD=(.+)") {
        $password = $matches[1]
        Write-Host "[✓] 检测到管理员密码配置" -ForegroundColor Green
        Write-Host "    当前密码: $password" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "提示: 如需修改密码，请编辑 backend\.env 文件" -ForegroundColor Gray
    } else {
        Write-Host "[!] 未检测到 ADMIN_PASSWORD 配置" -ForegroundColor Red
        Write-Host "    默认允许无密码进入管理模式（开发模式）" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "建议: 在生产环境中设置强密码" -ForegroundColor Yellow
    }
} else {
    Write-Host "[✗] 未找到 .env 文件" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  启动服务..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 启动后端
Write-Host "[1/2] 启动后端服务..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; npm start"
Start-Sleep -Seconds 2

# 启动前端
Write-Host "[2/2] 启动前端服务..." -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  服务启动完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "访问地址:" -ForegroundColor Cyan
Write-Host "  前端: http://localhost:3000" -ForegroundColor White
Write-Host "  后端: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "使用说明:" -ForegroundColor Cyan
Write-Host "  1. 打开浏览器访问 http://localhost:3000" -ForegroundColor White
Write-Host "  2. 点击右上角 '🔑 管理模式' 按钮" -ForegroundColor White
Write-Host "  3. 输入管理员密码: $password" -ForegroundColor White
Write-Host "  4. 开始使用管理功能！" -ForegroundColor White
Write-Host ""
Write-Host "详细文档:" -ForegroundColor Cyan
Write-Host "  - ADMIN_GUIDE.md       (使用指南)" -ForegroundColor Gray
Write-Host "  - TEST_GUIDE.md        (测试指南)" -ForegroundColor Gray
Write-Host "  - IMPLEMENTATION_SUMMARY.md (实现总结)" -ForegroundColor Gray
Write-Host ""
Write-Host "按任意键关闭此窗口（服务将继续在后台运行）..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
