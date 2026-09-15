#!/bin/bash
cd ~/Desktop/dev/RemyClone/docs/reference
for id in $(python3 -c "import json;[print(p['playbackId']) for p in json.load(open('projects.json'))['projects'] if p['type']=='motion']"); do
  out="2026-09-15/assets/videos/mux/$id.mp4"
  # pick the variant with the largest resolution
  best=$(curl -s "https://stream.mux.com/$id.m3u8" | awk '/RESOLUTION/{match($0,/RESOLUTION=([0-9]+)x([0-9]+)/,m); r=m[1]*m[2]; getline u; if(r>max){max=r; url=u}} END{print url}')
  [ -z "$best" ] && { echo "FAIL variant $id"; continue; }
  case "$best" in http*) ;; *) best="https://stream.mux.com/$best";; esac
  ffmpeg -y -loglevel error -i "$best" -c copy -bsf:a aac_adtstoasc -movflags +faststart "$out" && echo "done $id $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 $out)" || echo "FAIL $id"
done
echo ALLDONE
