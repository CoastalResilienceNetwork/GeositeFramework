@ECHO OFF

SET SCRIPTPATH=%~p0
SET ABSSCRIPTPATH=%~dp0
SET CWD=%CD%

cd %ABSSCRIPTPATH%

python runJstd.py .. %1
if %errorlevel% neq 0 (
    cd %CWD%
    exit /b %errorlevel%
)
cd %CWD%
