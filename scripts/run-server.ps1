$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))

function Test-Port {
	try {
		$client = New-Object System.Net.Sockets.TcpClient
		$client.Connect('127.0.0.1', 3460)
		$client.Close()
		return $true
	} catch {
		return $false
	}
}

if (Test-Port) { exit 0 }

if (-not (Test-Path 'build\index.js')) {
	bun run build
}

bun ./start.ts
