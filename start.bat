@echo off
echo =======================================================
echo          KHOI DONG CORE API - COMPANY MANAGEMENT        
echo =======================================================
echo.

echo [1/3] Dang khoi dong Database (PostgreSQL) bang Docker...
docker compose -f docker-compose.local.yml up -d postgres

echo.
echo [2/3] Kiem tra xem co thu tu nao dang chiem cong 3003 khong...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr :3003') DO (
    IF NOT "%%T"=="0" (
        echo Phat hien process %%T dang chay o cong 3003. Dang tat process...
        taskkill /PID %%T /F 2>nul
    )
)

echo.
echo [3/3] Dang khoi dong API Server...
echo API se chay tai: http://localhost:3003
echo Swagger Docs tai: http://localhost:3003/docs
echo.
echo Nhan Ctrl + C bat cu luc nao de tat server.
echo.

npm run start:dev
