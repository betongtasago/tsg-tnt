@echo off
REM ===== TSG-TNT AI Camera Agent — khoi dong tren Windows =====
REM Dung:  run.bat            -> bat dau giam sat
REM        run.bat --check    -> kiem tra ket noi roi thoat
REM        run.bat --snapshot CAM-CONG  -> chup 1 anh tu camera

cd /d "%~dp0"

if not exist "config.yaml" goto no_config
if not exist ".venv\Scripts\python.exe" goto no_venv

".venv\Scripts\python.exe" agent.py --config config.yaml %*
goto end

:no_config
echo [LOI] Chua co config.yaml
echo Hay sao chep config.example.yaml thanh config.yaml roi dien thong tin camera.
goto end

:no_venv
echo [LOI] Chua cai dat moi truong Python.
echo Chay setup.bat truoc.

:end
echo.
echo Agent da dung. Nhan phim bat ky de dong cua so.
pause
