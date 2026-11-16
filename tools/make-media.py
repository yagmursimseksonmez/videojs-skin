"""Builds each case's media for the demo: the video, a poster, a chapters track and a storyboard
(a sprite of frames plus its WebVTT), from media/cases.json and the portfolio's videos (the Chengel promo is made
here, by tools/make-promo.mjs).

python3 tools/make-media.py ~/Desktop/portfolio/public/videos
"""
import json, math, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.expanduser(sys.argv[1])
OUT = os.path.join(ROOT, 'apps/preview/public/media')
COLS = 10


def probe(path):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                                   'stream=width,height:format=duration', '-of', 'json', path])
    data = json.loads(out)
    s = data['streams'][0]
    return s['width'], s['height'], float(data['format']['duration'])


def ts(t):
    ms = round(t * 1000)
    return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}.{ms % 1000:03d}'


for case in json.load(open(os.path.join(ROOT, 'media/cases.json'))):
    # A case made here (the promo) names its file in this repo; the others come from the portfolio's videos.
    src = os.path.join(ROOT, case['path']) if 'path' in case else os.path.join(SRC, case['file'])
    dst = os.path.join(OUT, case['id'])
    os.makedirs(dst, exist_ok=True)
    w, h, dur = probe(src)
    shutil.copyfile(src, os.path.join(dst, 'video.mp4'))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(case['poster']), '-i', src, '-frames:v', '1',
                    '-vf', f'scale={min(w, 1400)}:-2', '-q:v', '3', os.path.join(dst, 'poster.jpg')], check=True)

    # Chapters: each runs to the next one, the last to the end.
    chapters = case['chapters']
    lines = ['WEBVTT', '']
    for i, (start, title) in enumerate(chapters):
        end = chapters[i + 1][0] if i + 1 < len(chapters) else dur
        lines += [f'{ts(start)} --> {ts(end)}', title, '']
    open(os.path.join(dst, 'chapters.vtt'), 'w').write('\n'.join(lines))

    # Storyboard: two frames a second for the short phone demos, one for longer ones.
    step = 0.5 if dur < 30 else 1.0
    tw = 180 if h > w else 320
    th = round(tw * h / w / 2) * 2
    count = math.ceil(dur / step)
    rows = math.ceil(count / COLS)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf',
                    f'fps={1 / step},scale={tw}:{th},tile={COLS}x{rows}', '-frames:v', '1', '-q:v', '5',
                    os.path.join(dst, 'storyboard.jpg')], check=True)
    lines = ['WEBVTT', '']
    for i in range(count):
        start, end = i * step, min((i + 1) * step, dur)
        x, y = i % COLS * tw, i // COLS * th
        lines += [f'{ts(start)} --> {ts(end)}', f'storyboard.jpg#xywh={x},{y},{tw},{th}', '']
    open(os.path.join(dst, 'storyboard.vtt'), 'w').write('\n'.join(lines))
    print(case['id'], f'{w}x{h}', f'{dur:.2f}s', f'{len(chapters)} chapters', f'{count} tiles')
