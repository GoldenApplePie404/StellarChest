@echo off
cd /d "%~dp0"
echo ========================================
echo   Galgame Toolkit Launcher
echo   %cd%
echo ========================================

rem === 1. Kill hung process on port 3000 ===
echo [CHECK] Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo [WARN] Port 3000 occupied by PID %%a, killing...
    taskkill /PID %%a /F >nul 2>&1
    timeout /t 2 /nobreak >nul
)

rem === 2. Check Node.js ===
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 22+
    pause
    exit /b
)

rem === 3. Create .env if missing ===
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env from .env.example
        copy ".env.example" ".env" >nul
    ) else (
        echo [ERROR] .env.example missing
        pause
        exit /b
    )
)

rem === 4. Install dependencies ===
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed
        pause
        exit /b
    )
) else (
    echo [INFO] Dependencies ok
)

rem === 5. Create data directories ===
if not exist "data" mkdir "data"
if not exist "data\uploads\images" mkdir "data\uploads\images"
if not exist "data\uploads\audio" mkdir "data\uploads\audio"
if not exist "data\uploads\projects" mkdir "data\uploads\projects"
if not exist "data\exports" mkdir "data\exports"

rem === 6. Initialize database ===
if not exist "data\galgame_toolkit.db" (
    echo [INFO] Initializing database...
    call npx prisma generate
    if errorlevel 1 (
        echo [ERROR] prisma generate failed
        pause
        exit /b
    )
    call npx prisma db push
    if errorlevel 1 (
        echo [ERROR] prisma db push failed
        pause
        exit /b
    )
    call npx -y tsx prisma/seed.ts
    if errorlevel 1 (
        echo [ERROR] Seed failed - try: npx tsx prisma/seed.ts
        pause
        exit /b
    )
) else (
    echo [INFO] Database ok
    call npx prisma db push --accept-data-loss >nul 2>&1
)

echo ========================================
echo   http://localhost:3000
echo   Press Ctrl+C to stop
echo ========================================
call npm run dev
pause
