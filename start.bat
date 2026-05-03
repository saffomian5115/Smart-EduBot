@echo off
title Smart EduBot Launcher
color 0A

echo.
echo  =======================================
echo    SMART EDUBOT — Starting Up...
echo  =======================================
echo.

echo [*] Ollama server start ho raha hai...
start "Ollama Server" cmd /k "ollama serve"
timeout /t 5 /nobreak >nul

:: ─── Step 1: venv check ───────────────────────────────────────────
if exist "venv\Scripts\activate.bat" (
    echo [OK] Virtual environment mili — activate ho rahi hai...
    call venv\Scripts\activate.bat
) else (
    echo [!] venv nahi mili — bana raha hun...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Python nahi mila! Python install karo aur dobara try karo.
        pause
        exit /b 1
    )
    call venv\Scripts\activate.bat
    echo [OK] venv ban gayi aur activate ho gayi.
)

:: ─── Step 2: libraries check ──────────────────────────────────────
echo.
echo [*] Libraries check ho rahi hain...

python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [!] Libraries nahi mili — requirements.txt se install ho rahi hain...
    if exist "backend\requirements.txt" (
        pip install -r backend\requirements.txt
    ) else if exist "requirements.txt" (
        pip install -r requirements.txt
    ) else (
        echo [!] requirements.txt nahi mili — default libraries install ho rahi hain...
        pip install fastapi uvicorn pymupdf sentence-transformers chromadb python-multipart httpx
    )
    if errorlevel 1 (
        echo [ERROR] Libraries install nahi hui. Internet check karo.
        pause
        exit /b 1
    )
    echo [OK] Sari libraries install ho gayi!
) else (
    echo [OK] Libraries pehle se maujood hain.
)

:: ─── Step 3: Backend start (new window) ───────────────────────────
echo.
echo [*] Backend start ho raha hai (port 8000)...

if exist "backend\main.py" (
    start "EduBot Backend" cmd /k "call venv\Scripts\activate.bat && cd backend && uvicorn main:app --reload --port 8000"
) else (
    echo [ERROR] backend\main.py nahi mili! Pehle main.py banao.
    pause
    exit /b 1
)

:: Backend ko thoda time do start hone ka
timeout /t 3 /nobreak >nul

:: ─── Step 4: Frontend check & start ──────────────────────────────
echo.
echo [*] Frontend check ho raha hai...

if exist "frontend\package.json" (
    echo [OK] Frontend mila.
    
    :: node_modules check
    if not exist "frontend\node_modules" (
        echo [!] node_modules nahi mila — npm install ho raha hai...
        cd frontend
        npm install
        if errorlevel 1 (
            echo [ERROR] npm install fail hua. Node.js install karo.
            pause
            exit /b 1
        )
        cd ..
        echo [OK] npm packages install ho gaye!
    ) else (
        echo [OK] node_modules pehle se maujood hai.
    )

    start "EduBot Frontend" cmd /k "cd frontend && npm run dev"
) else (
    echo [!] frontend\package.json nahi mili — React setup ho raha hai...
    cd frontend
    npx create-react-app .
    cd ..
    start "EduBot Frontend" cmd /k "cd frontend && npm start"
)

:: ─── Done ─────────────────────────────────────────────────────────
echo.
echo  =======================================
echo    Done! Do windows khul gayi hain:
echo    Backend  → http://localhost:8000
echo    Frontend → http://localhost:3000
echo  =======================================
echo.
echo  Ye window band kar sakte ho.
pause