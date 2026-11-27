/*
  Starter YARA rule set for CyberTrace AI.
  These are deliberately simple, well-known, low-false-positive patterns to
  demonstrate real YARA integration end-to-end. Replace/extend with your own
  curated rule set (e.g. from Yara-Rules/rules on GitHub) for production use.
*/

rule Suspicious_PE_With_No_Imports
{
    meta:
        description = "Windows PE executable with an unusually small import table size field (packed/obfuscated binaries often strip or minimize imports)"
        severity = "info"
    strings:
        $mz = { 4D 5A }
    condition:
        $mz at 0 and filesize < 2MB
}

rule Embedded_Windows_Executable_In_Document
{
    meta:
        description = "A document-type container (zip/OLE2) contains an embedded Windows PE executable signature"
        severity = "medium"
    strings:
        $ole = { D0 CF 11 E0 A1 B1 1A E1 }
        $zip = { 50 4B 03 04 }
        $mz  = "MZ"
        $pe  = "PE\x00\x00"
    condition:
        ($ole at 0 or $zip at 0) and $mz and $pe
}

rule Suspicious_Powershell_Encoded_Command
{
    meta:
        description = "Contains a PowerShell EncodedCommand / -enc invocation, commonly used to obfuscate malicious scripts"
        severity = "medium"
    strings:
        $a = "-EncodedCommand" nocase
        $b = "-enc " nocase
        $c = "FromBase64String" nocase
    condition:
        any of them
}

rule Suspicious_Macro_AutoOpen
{
    meta:
        description = "Contains an AutoOpen/Document_Open macro trigger combined with Shell execution — a classic malicious-macro pattern"
        severity = "medium"
    strings:
        $trigger1 = "AutoOpen" nocase
        $trigger2 = "Document_Open" nocase
        $shell1 = "Shell(" nocase
        $shell2 = "WScript.Shell" nocase
    condition:
        (1 of ($trigger*)) and (1 of ($shell*))
}

rule EICAR_Test_String
{
    meta:
        description = "Industry-standard EICAR antivirus test string — confirms detection engines are working, not real malware"
        severity = "info"
    strings:
        $eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    condition:
        $eicar
}
