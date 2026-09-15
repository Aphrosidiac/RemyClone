import json, re, subprocess, urllib.request
ps=[p for p in json.load(open('projects.json'))['projects'] if p['type']=='motion']
for p in ps:
    pid=p['playbackId']
    m=urllib.request.urlopen(f"https://stream.mux.com/{pid}.m3u8").read().decode()
    lines=m.splitlines(); best=None; bestr=0
    for i,l in enumerate(lines):
        mm=re.search(r'RESOLUTION=(\d+)x(\d+)',l)
        if mm and int(mm[1])*int(mm[2])>bestr:
            bestr=int(mm[1])*int(mm[2]); best=lines[i+1]
    out=f"2026-09-15/assets/videos/mux/{pid}.mp4"
    r=subprocess.run(["ffmpeg","-y","-loglevel","error","-i",best,"-c","copy","-bsf:a","aac_adtstoasc","-movflags","+faststart",out],capture_output=True,text=True)
    wh=subprocess.run(["ffprobe","-v","error","-select_streams","v:0","-show_entries","stream=width,height","-of","csv=p=0",out],capture_output=True,text=True).stdout.strip()
    print("done",pid,wh,"rc",r.returncode)
print("ALLDONE")
