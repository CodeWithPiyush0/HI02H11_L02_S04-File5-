# -*- coding: utf-8 -*-
"""[r126] Every picture the lesson ships is WebP and every video is WebM - converted here.

Yasir (2026-10-13): "convert all the images to webp, videos to webm ... and from now on whenever new
assets are dropped then convert it to the recommended format". This is that rule as a script, and the
lesson build runs it first, so an asset dropped in any format is converted the next time the lesson is
built - nobody has to remember to.

  pictures  .png .jpg .jpeg .gif  ->  .webp  (alpha kept; an animated GIF stays animated)
            the source is removed once its .webp is written - it is still in git history
  videos    .mp4 .mov .m4v        ->  .webm  (VP9, no audio track - the lesson's videos are scenery)
            an .mp4 is KEPT next to it: older iPhones cannot play WebM, and the game falls back to it
  audio     left exactly as delivered (Yasir's call: WAV would have taken the music from 4 MB to 62 MB)
  .svg / .ico are left alone - an SVG is already a vector picture, sharper than any WebP of it

Scope: 3_BUILD/assets/, except assets/UI/celebration/ (the celebration kit ships unchanged).

Run:  python 1_SPEC/normalize_assets.py          (the build calls it; safe to run any time)
"""
import os, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(HERE, "3_BUILD", "assets")   # [S04] this bundle is 3_BUILD
SKIP = [os.path.join(ROOT, "UI", "celebration")]
PICS = (".png", ".jpg", ".jpeg", ".gif")
VIDS = (".mp4", ".mov", ".m4v")


def to_webp(src):
    dst = os.path.splitext(src)[0] + ".webp"
    with Image.open(src) as im:                       # closed before the source is removed (Windows locks it)
        _save_webp(im, dst)
    before, after = os.path.getsize(src), os.path.getsize(dst)
    os.remove(src)
    return dst, before, after


def _save_webp(im, dst):
    if getattr(im, "is_animated", False) and im.n_frames > 1:
        # an animation stays an animation, frame timing and looping as in the source
        frames, durs = [], []
        for i in range(im.n_frames):
            im.seek(i)
            frames.append(im.convert("RGBA"))
            durs.append(im.info.get("duration", 80))
        frames[0].save(dst, "WEBP", save_all=True, append_images=frames[1:], duration=durs,
                       loop=im.info.get("loop", 0), quality=90, method=6)
    else:
        im = im.convert("RGBA") if (im.mode in ("RGBA", "LA", "P") or "transparency" in im.info) else im.convert("RGB")
        im.save(dst, "WEBP", quality=90, alpha_quality=100, method=6)


def to_webm(src):
    dst = os.path.splitext(src)[0] + ".webm"
    if os.path.isfile(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
        return None                                   # already converted from this very file
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-an", "-c:v", "libvpx-vp9",
                    "-b:v", "0", "-crf", "34", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2",
                    "-pix_fmt", "yuv420p", dst], check=True)
    if not src.lower().endswith(".mp4"):
        os.remove(src)                                # only an .mp4 is worth keeping as the fallback
    return dst, os.path.getsize(src) if os.path.exists(src) else 0, os.path.getsize(dst)


def main():
    done = []
    for root, _, files in os.walk(ROOT):
        if any(root == s or root.startswith(s + os.sep) for s in SKIP):
            continue
        for f in sorted(files):
            p = os.path.join(root, f)
            ext = os.path.splitext(f)[1].lower()
            try:
                if ext in PICS:
                    r = to_webp(p)
                elif ext in VIDS:
                    r = to_webm(p)
                else:
                    continue
            except Exception as e:
                sys.exit("X  could not convert %s: %s" % (p, e))
            if r:
                done.append((os.path.relpath(r[0], ROOT), r[1], r[2]))
    for name, b, a in done:
        print("  ->  %-48s %7.0f KB -> %7.0f KB" % (name, b / 1024, a / 1024))
    print("  OK  assets normalised (%d converted)" % len(done))


if __name__ == "__main__":
    main()
