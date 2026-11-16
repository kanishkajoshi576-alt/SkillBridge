$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$output = Join-Path $PSScriptRoot '..\build\skillbridge.ico'
$output = [System.IO.Path]::GetFullPath($output)
New-Item -ItemType Directory -Force -Path (Split-Path $output -Parent) | Out-Null

$bitmap = [System.Drawing.Bitmap]::new(256, 256, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::Transparent)

$background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(101, 88, 232))
$tile = [System.Drawing.Drawing2D.GraphicsPath]::new()
$tile.AddArc(20, 20, 56, 56, 180, 90)
$tile.AddArc(180, 20, 56, 56, 270, 90)
$tile.AddArc(180, 180, 56, 56, 0, 90)
$tile.AddArc(20, 180, 56, 56, 90, 90)
$tile.CloseFigure()
$graphics.FillPath($background, $tile)

$pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 12)
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$graphics.DrawLine($pen, 76, 84, 180, 84)
$graphics.DrawLine($pen, 76, 172, 180, 172)
$graphics.DrawLine($pen, 105, 68, 76, 84)
$graphics.DrawLine($pen, 76, 84, 105, 100)
$graphics.DrawLine($pen, 151, 156, 180, 172)
$graphics.DrawLine($pen, 180, 172, 151, 188)

$pngStream = [System.IO.MemoryStream]::new()
$bitmap.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$png = $pngStream.ToArray()
$file = [System.IO.File]::Create($output)
$writer = [System.IO.BinaryWriter]::new($file)
$writer.Write([UInt16]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]1)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([byte]0)
$writer.Write([UInt16]1)
$writer.Write([UInt16]32)
$writer.Write([UInt32]$png.Length)
$writer.Write([UInt32]22)
$writer.Write($png)
$writer.Dispose()
$file.Dispose()
$pngStream.Dispose()
$pen.Dispose()
$tile.Dispose()
$background.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Generated SkillBridge desktop icon: $output"
