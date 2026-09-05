@echo off
cd /d "%~dp0"
chcp 65001 >nul

echo ========================================
echo   星之匣 — 清理工具
echo   %cd%
echo ========================================

rem === 先杀掉可能占用缓存的进程 ===
echo.
echo [安全] 检查并停止占用端口 3000 的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [WARN] 发现 PID %%a 占用 3000，正在终止...
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

rem === 显示各缓存大小 ===
echo.
echo  当前缓存占用估算：
echo.
setlocal enabledelayedexpansion

set PROJ_CACHE=0
if exist ".next" (
    for /f "delims=" %%i in ('dir /s /b ".next" 2^>nul ^| find /c /v ""') do set NEXT_FILES=%%i
    for /f "delims=" %%i in ('du -sh ".next" 2^>nul ^| cut -f1') do set PROJ_CACHE=.next
    echo   .next\                    存在（Next.js 构建缓存）
) else (
    echo   .next\                    不存在
)

if exist ".turbo" (
    echo   .turbo\                   存在
) else (
    echo   .turbo\                   不存在
)

if exist "node_modules\electron\dist\electron.exe" (
    echo   Electron 二进制           已安装
) else (
    echo   Electron 二进制           未安装或装残
)

endlocal

echo.
echo  全局缓存（跨项目共享，不在项目目录内）：
echo   npm  registry 缓存        %%APPDATA%%\npm-cache
echo   Electron 二进制缓存       %%LOCALAPPDATA%%\electron\Cache
echo   electron-builder 工具缓存 %%LOCALAPPDATA%%\electron-builder\Cache
echo.

rem === 菜单 ===
echo ========================================
echo  请选择要清理的内容：
echo.
echo    [1] .next 构建缓存（推荐，200-500MB）
echo        清了之后 next dev / next start 会重新构建
echo        能解决 middleware 编译卡死等问题
echo.
echo    [2] Electron 全局二进制缓存（~100MB）
echo        清了之后下次 npm install electron 会重新下载
echo        解决 Electron 二进制装残问题
echo.
echo    [3] electron-builder 工具缓存（~200MB）
echo        清了之后下次打包会重新下载 NSIS/winCodeSign 等
echo        解决打包时工具下载残了的问题
echo.
echo    [4] 全局 npm registry 缓存（1-5GB）
echo        清了之后所有项目 npm install 都会重新下载
echo        只有在 npm install 本身持续失败时才需要
echo.
echo    [5] 全部清理（危险，包含上面 4 项）
echo.
echo    [0] 退出
echo ========================================
set /p choice=请输入选项: 

if "%choice%"=="0" exit /b
if "%choice%"=="1" goto :clean_next
if "%choice%"=="2" goto :clean_electron_cache
if "%choice%"=="3" goto :clean_builder_cache
if "%choice%"=="4" goto :clean_npm_cache
if "%choice%"=="5" goto :clean_all
echo [ERROR] 无效选项 &choice
pause
exit /b

rem ---------- 1. .next 构建缓存 ----------
:clean_next
echo.
echo [1/1] 删除 .next 目录...
if exist ".next" (
    rmdir /s /q ".next"
    echo [OK] .next 已删除
) else (
    echo [SKIP] .next 不存在
)
if exist ".turbo" (
    rmdir /s /q ".turbo"
    echo [OK] .turbo 已删除
)
echo.
echo ? 清理完成！下次启动会重新构建
pause
exit /b

rem ---------- 2. Electron 全局二进制缓存 ----------
:clean_electron_cache
echo.
echo [1/1] 删除 Electron 全局缓存...
set E_CACHE="%LOCALAPPDATA%\electron\Cache"
set E_DIST="%LOCALAPPDATA%\electron\dist"
if exist %E_CACHE% (
    rmdir /s /q %E_CACHE%
    echo [OK] %LOCALAPPDATA%\electron\Cache 已删除
) else (
    echo [SKIP] %LOCALAPPDATA%\electron\Cache 不存在
)
if exist %E_DIST% (
    rmdir /s /q %E_DIST%
    echo [OK] %LOCALAPPDATA%\electron\dist 已删除
) else (
    echo [SKIP] %LOCALAPPDATA%\electron\dist 不存在
)
echo.
echo ? 清理完成！下次 npm install electron 会重新下载二进制
pause
exit /b

rem ---------- 3. electron-builder 工具缓存 ----------
:clean_builder_cache
echo.
echo [1/1] 删除 electron-builder 全局缓存...
set EB_CACHE="%LOCALAPPDATA%\electron-builder\Cache"
if exist %EB_CACHE% (
    rmdir /s /q %EB_CACHE%
    echo [OK] %LOCALAPPDATA%\electron-builder\Cache 已删除
) else (
    echo [SKIP] %LOCALAPPDATA%\electron-builder\Cache 不存在
)
echo.
echo ? 清理完成！下次打包会重新下载 NSIS/winCodeSign
pause
exit /b

rem ---------- 4. 全局 npm registry 缓存 ----------
:clean_npm_cache
echo.
set /p confirm=确认清理全局 npm 缓存？(y/N): 
if /i not "%confirm%"=="y" (
    echo 已取消
    pause
    exit /b
)
echo [1/1] 执行 npm cache clean --force...
call npm cache clean --force
echo.
echo ? 清理完成！下次 npm install 会重新下载所有包
pause
exit /b

rem ---------- 5. 全部清理 ----------
:clean_all
echo.
set /p confirm=??  确认全部清理？（.next + Electron缓存 + builder缓存 + npm缓存）y/N: 
if /i not "%confirm%"=="y" (
    echo 已取消
    pause
    exit /b
)

call :clean_next
call :clean_electron_cache
call :clean_builder_cache
call :clean_npm_cache

echo.
echo ========================================
echo   ? 全部清理完成
echo   建议下一步：
echo     start.bat          # 重新启动（生产模式）
echo     npm install        # 重新装依赖（如果清了全局 npm 缓存）
echo ========================================
pause
exit /b
