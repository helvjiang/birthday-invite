# -*- coding: utf-8 -*-
"""合成古风循环背景音乐（五声音阶，纯标准库，输出 assets/bgm.wav）。
   想改风格：调 melody / bass 的音名与拍数，或改 SR、amp 即可。"""
import wave, math, struct, os

SR = 22050  # 采样率（单声道，体积可控）

def hz(n):
    t = {'C3':130.81,'D3':146.83,'E3':164.81,'G3':196.00,'A3':220.00,
         'C4':261.63,'D4':293.66,'E4':329.63,'G4':392.00,'A4':440.00,
         'C5':523.25,'D5':587.33,'E5':659.25,'G5':783.99,'A5':880.00}
    return t[n]

def tone(freq, dur, amp=0.28):
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        a = min(1.0, t / 0.01)
        rel = 1.0 if t < dur - 0.08 else max(0.0, (dur - t) / 0.08)
        env = a * rel
        s = math.sin(2 * math.pi * freq * t)
        s += 0.3 * math.sin(2 * math.pi * freq * 2 * t)   # 八度泛音增厚度
        out.append(env * amp * s)
    return out

# 主旋律（古风五声：宫商角徵羽）拍=0.5s
melody = [
    ('E4',1),('G4',1),('A4',1),('G4',1),
    ('E4',1),('D4',1),('E4',2),
    ('C4',1),('E4',1),('G4',1),('A4',1),
    ('G4',1),('E4',1),('D4',2),
    ('A4',1),('C5',1),('A4',1),('G4',1),
    ('E4',1),('D4',1),('E4',2),
    ('G4',1),('A4',1),('G4',1),('E4',1),
    ('D4',1),('C4',1),('D4',2),
] * 2   # 重复一次，约 32s 循环
bass = [('C3',4),('G3',4),('A3',4),('G3',4),('C3',4),('G3',4),('A3',4),('E3',4)] * 2

beat = 0.5

def render(seq, amp):
    total = int(SR * sum(b * beat for _, b in seq))
    buf = [0.0] * total
    pos = 0
    for note, beats in seq:
        samples = tone(hz(note), beats * beat, amp)
        for i, s in enumerate(samples):
            if pos + i < total:
                buf[pos + i] += s
        pos += int(SR * beats * beat)
    return buf

mel = render(melody, 0.26)
bas = render(bass, 0.14)
n = max(len(mel), len(bas))
out = [0.0] * n
for i in range(n):
    out[i] = (mel[i] if i < len(mel) else 0) + (bas[i] if i < len(bas) else 0)

# 简易回声
delay_n = int(SR * 0.33)
buf2 = [0.0] * (n + delay_n)
for i in range(n):
    buf2[i] += out[i]
    if i + delay_n < len(buf2):
        buf2[i + delay_n] += out[i] * 0.22

# 归一化 + 首尾淡入淡出（loop 平滑）
peak = max(1e-6, max(abs(x) for x in buf2))
fade = int(SR * 0.4)
for i in range(len(buf2)):
    if i < fade:
        buf2[i] *= i / fade
    elif i > len(buf2) - fade:
        buf2[i] *= (len(buf2) - i) / fade
    buf2[i] = max(-1.0, min(1.0, buf2[i] / peak * 0.9))

here = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(here, "bgm.wav")
w = wave.open(path, "w")
w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
frames = bytearray()
for v in buf2:
    frames += struct.pack("<h", int(v * 32767))
w.writeframes(bytes(frames))
w.close()
print("OK", round(len(buf2) / SR, 1), "s ->", path)
