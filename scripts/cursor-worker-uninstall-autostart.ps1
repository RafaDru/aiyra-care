# Remove Windows logon task for Cursor My Machines worker.
# Legacy name (pre-rename): AiyraCare-CursorMyMachinesWorker

$TaskName = "Ananeri-CursorMyMachinesWorker"
$LegacyName = "AiyraCare-CursorMyMachinesWorker"

foreach ($name in @($TaskName, $LegacyName)) {
  $existing = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  if ($existing) {
    Unregister-ScheduledTask -TaskName $name -Confirm:$false
    Write-Host "Removed scheduled task: $name"
  }
}
if (-not (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) -and
    -not (Get-ScheduledTask -TaskName $LegacyName -ErrorAction SilentlyContinue)) {
  Write-Host "No Cursor My Machines autostart task found (checked $TaskName and $LegacyName)."
}
