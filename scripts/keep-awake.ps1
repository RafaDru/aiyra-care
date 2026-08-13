# Mantém o sistema acordado (monitor pode desligar sozinho).
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class SleepBlock {
  [DllImport("kernel32.dll")]
  public static extern uint SetThreadExecutionState(uint es);
  public const uint ES_CONTINUOUS = 0x80000000;
  public const uint ES_SYSTEM_REQUIRED = 0x00000001;
}
"@
[SleepBlock]::SetThreadExecutionState([SleepBlock]::ES_CONTINUOUS | [SleepBlock]::ES_SYSTEM_REQUIRED)
while ($true) { Start-Sleep -Seconds 300 }
