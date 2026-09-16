# Remove Windows logon task for Cursor My Machines worker.

$TaskName = "AiyraCare-CursorMyMachinesWorker"
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
  Write-Host "Removed scheduled task: $TaskName"
} else {
  Write-Host "Task not found: $TaskName"
}
