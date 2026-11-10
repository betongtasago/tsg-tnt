@echo off
REM ===== TSG-TNT AI Camera Agent — cai dat lan dau =====
REM Tao moi truong ao va cai thu vien. Chay 1 lan.

cd /d "%~dp0"

echo === Kiem tra Python ===
python --version
if errorlevel 1 goto no_python

echo.
echo === Tao moi truong ao .venv ===
if exist ".venv\Scripts\python.exe" goto venv_ready
python -m venv .venv
if errorlevel 1 goto venv_fail

:venv_ready
echo.
echo === Nang cap pip ===
".venv\Scripts\python.exe" -m pip install --upgrade pip

echo.
echo === Cai thu vien (co the mat 5-15 phut) ===
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto pip_fail

echo.
echo === Tao file cau hinh ===
if exist "config.yaml" goto cfg_exists
copy config.example.yaml config.yaml >nul
echo Da tao config.yaml — hay mo file nay va dien thong tin camera.
goto done

:cfg_exists
echo config.yaml da ton tai, giu nguyen.

:done
echo.
echo === Hoan tat ===
echo Buoc tiep theo:
echo   1. Mo config.yaml, dien base_url, api_token, rtsp_url cua camera
echo   2. Chay: run.bat --check    (kiem tra ket noi)
echo   3. Chay: run.bat            (bat dau giam sat)
echo.
pause
exit /b 0

:no_python
echo [LOI] Khong tim thay Python. Tai Python 3.11 tu python.org va nho tick
echo       "Add Python to PATH" khi cai dat.
pause
exit /b 1

:venv_fail
echo [LOI] Khong tao duoc moi truong ao.
pause
exit /b 1

:pip_fail
echo [LOI] Cai thu vien that bai. Xem thong bao loi o tren.
pause
exit /b 1
