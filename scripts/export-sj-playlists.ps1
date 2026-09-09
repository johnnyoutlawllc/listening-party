# Re-export Suffering Jukebox playlists into src/data/sj-playlists.json
# Usage (PowerShell, from anywhere):
#   powershell -File scripts/export-sj-playlists.ps1
#
# Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in C:\AI Projects\env.local

$ErrorActionPreference = "Stop"
$lines = Get-Content "C:\AI Projects\env.local"
function Get-EnvVal($name) {
  foreach ($line in $lines) {
    if ($line -match "^$([regex]::Escape($name))=(.*)$") {
      return $matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}
$url = Get-EnvVal "NEXT_PUBLIC_SUPABASE_URL"
$key = Get-EnvVal "SUPABASE_SERVICE_ROLE_KEY"
if (-not $url -or -not $key) { throw "Missing Supabase env" }
$h = @{ apikey = $key; Authorization = "Bearer $key"; "Accept-Profile" = "jukebox" }

function Fetch-Paged([string]$table, [string]$select) {
  $acc = New-Object System.Collections.Generic.List[object]
  $offset = 0
  $limit = 1000
  while ($true) {
    $u = "$url/rest/v1/${table}?select=$select&order=id&offset=$offset&limit=$limit"
    $batch = Invoke-RestMethod -Uri $u -Headers $h
    if (-not $batch -or $batch.Count -eq 0) { break }
    foreach ($row in $batch) { $acc.Add($row) }
    if ($batch.Count -lt $limit) { break }
    $offset += $limit
  }
  return $acc
}

$playlists = Fetch-Paged "playlists" "id,name,description,visibility,slug,user_email,user_name,created_at,updated_at,is_public"
$pts = Fetch-Paged "playlist_tracks" "id,playlist_id,track_id,position,added_at"
$tracks = Fetch-Paged "tracks" "id,name,album_id,duration_ms"
$albums = Fetch-Paged "albums" "id,name,artist_id,art_url,release_date"
$artists = Fetch-Paged "artists" "id,name"
$videos = Fetch-Paged "track_videos" "id,track_id,video_id,is_primary,is_playable,view_count"

$trackById = @{}; foreach ($t in $tracks) { $trackById[$t.id] = $t }
$albumById = @{}; foreach ($a in $albums) { $albumById[$a.id] = $a }
$artistById = @{}; foreach ($a in $artists) { $artistById[$a.id] = $a }
$videoByTrack = @{}
foreach ($v in $videos) {
  if (-not $v.video_id) { continue }
  $cur = $videoByTrack[$v.track_id]
  if (-not $cur) { $videoByTrack[$v.track_id] = $v; continue }
  if ($v.is_primary -and -not $cur.is_primary) { $videoByTrack[$v.track_id] = $v; continue }
  if (($v.is_playable -eq $true) -and ($cur.is_playable -ne $true)) { $videoByTrack[$v.track_id] = $v }
}
$ptsByPl = @{}
foreach ($pt in $pts) {
  if (-not $ptsByPl.ContainsKey($pt.playlist_id)) { $ptsByPl[$pt.playlist_id] = New-Object System.Collections.Generic.List[object] }
  $ptsByPl[$pt.playlist_id].Add($pt)
}

$library = New-Object System.Collections.Generic.List[object]
$libIndex = @{}
$outPlaylists = New-Object System.Collections.Generic.List[object]
$skippedNoVideo = 0
$importedTracks = 0

foreach ($pl in ($playlists | Sort-Object name)) {
  $items = @()
  if ($ptsByPl.ContainsKey($pl.id)) {
    foreach ($pt in ($ptsByPl[$pl.id] | Sort-Object position)) {
      $tr = $trackById[$pt.track_id]
      if (-not $tr) { continue }
      $vid = $videoByTrack[$pt.track_id]
      if (-not $vid -or -not $vid.video_id) { $skippedNoVideo++; continue }
      $yt = [string]$vid.video_id
      if (-not $libIndex.ContainsKey($yt)) {
        $album = if ($tr.album_id) { $albumById[$tr.album_id] } else { $null }
        $artist = if ($album -and $album.artist_id) { $artistById[$album.artist_id] } else { $null }
        $artistName = if ($artist) { [string]$artist.name } else { $null }
        $title = if ($artistName) { "$($tr.name) - $artistName" } else { [string]$tr.name }
        $library.Add([ordered]@{
          id = "sj_$($tr.id)"
          youtubeId = $yt
          title = $title
          channelTitle = $artistName
          albumArtUrl = if ($album) { [string]$album.art_url } else { $null }
          thumbUrl = "https://i.ytimg.com/vi/$yt/hqdefault.jpg"
          addedAt = if ($pt.added_at) { $pt.added_at } else { $pl.created_at }
          sourceTrackId = $tr.id
        })
        $libIndex[$yt] = "sj_$($tr.id)"
      }
      $items += $libIndex[$yt]
      $importedTracks++
    }
  }
  $vis = switch ($pl.visibility) { "public" { "public" }; "link" { "link" }; default { "private" } }
  $outPlaylists.Add([ordered]@{
    id = "sjpl_$($pl.id)"
    name = $pl.name
    itemIds = @($items)
    visibility = $vis
    createdAt = $pl.created_at
    updatedAt = $pl.updated_at
    source = @{
      sjPlaylistId = $pl.id
      slug = $pl.slug
      ownerEmail = $pl.user_email
      ownerName = $pl.user_name
      description = $pl.description
    }
  })
}

$payload = [ordered]@{
  importedAt = (Get-Date).ToUniversalTime().ToString("o")
  source = "suffering-jukebox"
  stats = [ordered]@{
    playlists = $outPlaylists.Count
    libraryItems = $library.Count
    playlistTrackSlots = $importedTracks
    skippedNoVideo = $skippedNoVideo
  }
  library = $library
  playlists = $outPlaylists
}

$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path (Join-Path $PSScriptRoot "..\src\data"))) {
  # script lives in listening-party/scripts
}
$outFile = Join-Path $PSScriptRoot "..\src\data\sj-playlists.json"
New-Item -ItemType Directory -Force -Path (Split-Path $outFile) | Out-Null
[System.IO.File]::WriteAllText((Resolve-Path (Split-Path $outFile)).Path + "\sj-playlists.json", ($payload | ConvertTo-Json -Depth 8 -Compress), [System.Text.UTF8Encoding]::new($false))
Write-Host ($payload.stats | ConvertTo-Json)
Write-Host "wrote $outFile"
