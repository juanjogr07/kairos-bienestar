param(
  [Parameter(Mandatory = $false)]
  [string]$Email = "demo@kairos.app",

  [Parameter(Mandatory = $false)]
  [string]$Password = "KairosDemo123!",

  [Parameter(Mandatory = $false)]
  [string]$DisplayName = "Usuario Demo Kairós"
)

$ErrorActionPreference = "Stop"

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_KEY) {
  throw "Faltan variables de entorno SUPABASE_URL y/o SUPABASE_SERVICE_KEY."
}

$baseUrl = $env:SUPABASE_URL.TrimEnd("/")
$headers = @{
  "apikey"        = $env:SUPABASE_SERVICE_KEY
  "Authorization" = "Bearer $($env:SUPABASE_SERVICE_KEY)"
  "Content-Type"  = "application/json"
}

function Get-ExistingUser([string]$targetEmail) {
  $url = "$baseUrl/auth/v1/admin/users?email=$([System.Uri]::EscapeDataString($targetEmail))"
  try {
    $resp = Invoke-RestMethod -Method GET -Uri $url -Headers $headers
    if ($resp.users -and $resp.users.Count -gt 0) {
      return $resp.users[0]
    }
    return $null
  } catch {
    return $null
  }
}

$existing = Get-ExistingUser -targetEmail $Email
if ($existing) {
  Write-Host "Usuario demo ya existe."
  Write-Host "UUID: $($existing.id)"
  Write-Host "Email: $($existing.email)"
  exit 0
}

$createUrl = "$baseUrl/auth/v1/admin/users"
$payload = @{
  email         = $Email
  password      = $Password
  email_confirm = $true
  user_metadata = @{
    full_name = $DisplayName
    role      = "demo"
  }
} | ConvertTo-Json -Depth 4

$created = Invoke-RestMethod -Method POST -Uri $createUrl -Headers $headers -Body $payload

Write-Host "Usuario demo creado correctamente."
Write-Host "UUID: $($created.id)"
Write-Host "Email: $($created.email)"
Write-Host ""
Write-Host "Siguiente paso:"
Write-Host "1) Reemplaza DEMO_USER_UUID en los seeds 003/004/005"
Write-Host "2) Ejecuta esos SQL en Supabase SQL Editor"
