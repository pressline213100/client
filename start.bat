@echo off
title 🃏 Poker World - 撲克牌遊戲平台
color 0A
echo.
echo  ╔══════════════════════════════════════╗
echo  ║    🃏  POKER WORLD  啟動中...        ║
echo  ║    多人撲克遊戲平台                  ║
echo  ╚══════════════════════════════════════╝
echo.

echo [1/2] 啟動遊戲伺服器 (Port 3001)...
start "🃏 Poker Server" cmd /k "cd /d %~dp0server && node index.js"
timeout /t 2 /nobreak >nul

echo [2/2] 啟動前端介面 (Port 3000)...
start "🃏 Poker Client" cmd /k "cd /d %~dp0client && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  ✅ 啟動完成！
echo  🌐 瀏覽器開啟: http://localhost:3000
echo.
start http://localhost:3000
pause
