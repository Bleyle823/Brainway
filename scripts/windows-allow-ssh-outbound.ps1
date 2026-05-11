#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Allow outbound TCP to remote port 22 (SSH client) in Windows Defender Firewall.

.NOTES
  Run: Right-click PowerShell -> Run as administrator, then:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
    & "C:\Users\Omen\Desktop\Brainway\scripts\windows-allow-ssh-outbound.ps1"

  If SSH still times out, the block is usually Hostinger firewall, ISP, or router — not Windows.
#>

$Name = "SSH client - outbound TCP 22"
$existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Rule already exists: $Name"
  exit 0
}

New-NetFirewallRule `
  -DisplayName $Name `
  -Direction Outbound `
  -Action Allow `
  -Protocol TCP `
  -RemotePort 22 `
  -Profile Any `
  -Enabled True

Write-Host "Created firewall rule: $Name (outbound TCP to remote port 22)"
