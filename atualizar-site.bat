@echo off
echo ========================================
echo ATUALIZAR SITE - AUTOMATICO
echo ========================================
echo.

cd /d "D:\Devin projetos"

echo Adicionando alteracoes...
git add index.html

echo Fazendo commit...
git commit -m "Sistema de autenticacao com roles (admin/user) e estrutura para assinaturas - Painel administrativo"

echo Enviando para GitHub...
git push

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERRO AO FAZER PUSH
    echo ========================================
    echo.
    echo Possiveis causas:
    echo 1. Voce nao fez login no GitHub
    echo 2. Credenciais expiraram
    echo 3. Problema de conexao
    echo.
    echo Tente executar: setup-inicial.bat
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCESSO! Site atualizado!
echo ========================================
echo.
echo Aguarde 1-2 minutos e acesse:
echo https://kauesn.github.io/boitel-analytics-pro/
echo.
echo Para ver as mudancas, atualize a pagina (F5)
echo.
pause
