set -e
V=/mnt/user-data/uploads/351afc9e-7ace-4b97-b5be-7596ddae0d1b.mp4
F=/usr/share/fonts/truetype/google-fonts/ofl/anton/Anton-Regular.ttf
T=/home/claude/speed/txt
i=0; : > list.txt
for s in 30.2:33.0 3.6:21.8 33.0:39.6 44.0:47.5 52.0:55.2; do a=${s%:*}; b=${s#*:}; d=$(echo "$b-$a"|bc)
 ffmpeg -v error -y -ss $a -i $V -t $d -vf "fps=30,crop=1500:1080:210:0,scale=1080:778,setsar=1" -af "afade=t=in:d=0.04,afade=t=out:st=$(echo "$d-0.05"|bc):d=0.05" -c:v libx264 -preset veryfast -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 seg$i.mp4
 echo "file 'seg$i.mp4'" >> list.txt; i=$((i+1)); done
ffmpeg -v error -y -f concat -safe 0 -i list.txt -c copy joined.mp4
ffmpeg -v error -y -i joined.mp4 -filter_complex "
[0:v]split[a][b];
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:2,eq=brightness=-0.18:saturation=1.2[bg];
[bg][b]overlay=0:571,
drawtext=fontfile=$F:textfile=$T/h1.txt:fontsize=92:fontcolor=white:borderw=7:bordercolor=black:x=(w-tw)/2:y=300:enable='lt(t,2.8)',
drawtext=fontfile=$F:textfile=$T/h2.txt:fontsize=104:fontcolor=0xFF4FA3:borderw=7:bordercolor=black:x=(w-tw)/2:y=410:enable='lt(t,2.8)',
drawtext=fontfile=$F:textfile=$T/t1.txt:fontsize=110:fontcolor=0xFF4FA3:borderw=7:bordercolor=black:x=(w-tw)/2:y=290:enable='gte(t,2.8)',
drawtext=fontfile=$F:textfile=$T/t2.txt:fontsize=76:fontcolor=white:borderw=6:bordercolor=black:x=(w-tw)/2:y=420:enable='gte(t,2.8)',
drawtext=fontfile=$F:textfile=$T/c1.txt:fontsize=100:fontcolor=0xFFC94A:borderw=7:bordercolor=black:x=(w-tw)/2:y=1420:enable='gte(t,27.6)',
drawtext=fontfile=$F:textfile=$T/c2.txt:fontsize=58:fontcolor=white:borderw=5:bordercolor=black:x=(w-tw)/2:y=1545:enable='gte(t,27.6)',
fade=t=out:st=33.9:d=0.4[v];
[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=33.7:d=0.6[au]" -map "[v]" -map "[au]" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart /mnt/user-data/outputs/GTA6_Jason_Lucia_TikTok.mp4
