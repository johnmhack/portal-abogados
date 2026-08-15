# Crear perfiles equipo — ejecutar DESPUÉS de:
# 1) SQL: supabase/rol_contador.sql
# 2) Deploy: npx supabase functions deploy create-user --project-ref mlujhiryxpmyxgwmshtr
#
# Uso (PowerShell desde la raíz del proyecto):
#   .\scripts\crear-equipo.ps1
# Requiere .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot "..\.env"
if (-not (Test-Path $envFile)) { throw "No existe .env" }

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $k, $v = $_.Split('=', 2)
  if ($k -and $v) { Set-Item -Path "Env:$($k.Trim())" -Value $v.Trim().Trim('"').Trim("'") }
}

$url = "$($env:VITE_SUPABASE_URL)/functions/v1/create-user"
$key = $env:VITE_SUPABASE_ANON_KEY
if (-not $url -or -not $key) { throw "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY" }

$users = @(
  @{ nombre = "Carlos Mario"; apellido = "Zamudio Arias"; email = "carlos.zamudio@abogadossar.com"; rol = "abogado" }
  @{ nombre = "Luis Alberto"; apellido = "Ortiz Morales"; email = "luis.ortiz@abogadossar.com"; rol = "abogado" }
  @{ nombre = "Mary Isabel"; apellido = "Pineda Paez"; email = "mary.pineda@abogadossar.com"; rol = "abogado" }
  @{ nombre = "Nelson Andres"; apellido = "Losada Sanabria"; email = "nelson.losada@abogadossar.com"; rol = "abogado" }
  @{ nombre = "Nilson Arturo"; apellido = "Vega Vasquez"; email = "nilson.vega@abogadossar.com"; rol = "abogado" }
  @{ nombre = "Arturo"; apellido = "Alvarez Patow"; email = "arturo.alvarez.cont@abogadossar.com"; rol = "contador" }
  @{ nombre = "Jorge Alejandro"; apellido = "Munoz Pena"; email = "jorge.munoz.cont@abogadossar.com"; rol = "contador" }
)

$headers = @{
  "Content-Type" = "application/json"
  "Authorization" = "Bearer $key"
}

foreach ($u in $users) {
  Write-Host "Creando $($u.email) ($($u.rol))..." -NoNewline
  try {
    $body = $u | ConvertTo-Json -Compress
    $res = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $body
    if ($res.error) { Write-Host " ERROR: $($res.error)" -ForegroundColor Red }
    else { Write-Host " OK" -ForegroundColor Green }
  } catch {
    $msg = $_.ErrorDetails.Message
    if (-not $msg) { $msg = $_.Exception.Message }
    Write-Host " ERROR: $msg" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Contraseña inicial de todos: Temporal123!"
Write-Host "Nota: email de Jorge sin ñ (jorge.munoz.cont@...) para evitar problemas de correo."
