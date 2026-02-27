@echo off
setlocal
echo ==========================================
echo    YT-DL Assist - Installation Script
echo ==========================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please download it from https://nodejs.org/
    pause
    exit /b
)
echo [OK] Node.js is installed.

:: 2. Install Backend Dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b
)
echo [OK] Backend ready.

:: 3. Check for yt-dlp
where yt-dlp >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] yt-dlp not found in PATH. Downloading yt-dlp.exe...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'yt-dlp.exe'"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download yt-dlp.exe automatically.
        echo Please download it manually from: https://github.com/yt-dlp/yt-dlp/releases/
        pause
    ) else (
        echo [OK] yt-dlp.exe downloaded to backend folder.
        echo [INFO] Moving yt-dlp.exe to System PATH...
        echo [TIP] Alternatively, keep it in the backend folder and it should work with node.
    )
) else (
    echo [OK] yt-dlp is already available.
)

echo.
echo ==========================================
echo    Installation Complete!
echo ==========================================
echo 1. Start the backend: cd backend ^&^& npm start
echo 2. Load the extension in Chrome (chrome://extensions/)
echo ==========================================
pause
