#!/usr/bin/env python3
"""
Pátria: Compound V — sintetiza os 4 sons customizados do mod (PCM 16-bit, mono, 22050 Hz).
Saída: Patria_RP/sounds/powers/{inject,laser,scream,transform}.wav
"""
import math
import os
import random
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "Patria_RP", "sounds", "powers")
os.makedirs(OUT, exist_ok=True)
SR = 22050


def clamp(x, lo=-1.0, hi=1.0):
    return lo if x < lo else (hi if x > hi else x)


def write_wav(name, samples):
    # normaliza
    peak = max(1e-9, max(abs(s) for s in samples))
    gain = 0.92 / peak
    path = os.path.join(OUT, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = b"".join(struct.pack("<h", int(clamp(s * gain) * 32767)) for s in samples)
        w.writeframes(frames)
    print("saved", path, f"({len(samples)/SR:.2f}s)")


def env_pulse(t, attack, sustain, release, total):
    if t < attack:
        return t / attack
    if t < attack + sustain:
        return 1.0
    rem = total - (attack + sustain)
    if rem <= 0:
        return 1.0
    return max(0.0, (total - t) / rem)


def synth_inject():
    dur = 0.55
    n = int(SR * dur)
    out = []
    random.seed(7)
    for i in range(n):
        t = i / SR
        # clique seco inicial (seringa entrando)
        click = 0.0
        if t < 0.03:
            click = (random.random() * 2 - 1) * (1 - t / 0.03) * 0.7
        # thump grave de injeção
        thump = math.sin(2 * math.pi * 68 * t) * math.exp(-t * 9) * 0.9 if t < 0.35 else 0.0
        # borbulhar do soro (dois pulsos rápidos)
        g1 = math.exp(-((t - 0.16) ** 2) / (2 * 0.012 ** 2)) * math.sin(2 * math.pi * 240 * t) * 0.5
        g2 = math.exp(-((t - 0.30) ** 2) / (2 * 0.012 ** 2)) * math.sin(2 * math.pi * 300 * t) * 0.45
        # shimmer ascendente de poder acordando
        freq = 320 + 900 * (t / dur)
        shim = math.sin(2 * math.pi * freq * t) * 0.16 * smoothstep(0.25, 0.9, t / dur)
        out.append(click + thump + g1 + g2 + shim)
    return out


def smoothstep(a, b, x):
    x = clamp((x - a) / (b - a), 0.0, 1.0)
    return x * x * (3 - 2 * x)


def synth_laser():
    dur = 0.42
    n = int(SR * dur)
    out = []
    random.seed(11)
    phase = 0.0
    for i in range(n):
        t = i / SR
        # varredura descendente (zap)
        freq = 1500 * math.exp(-t * 6.2) + 160
        phase += 2 * math.pi * freq / SR
        carrier = math.tanh(2.4 * math.sin(phase))  # saturação -> harmônicos
        # modulação de anel metálica
        ring = math.sin(2 * math.pi * 47 * t)
        # sub-baixo no final do disparo
        sub = math.sin(2 * math.pi * 55 * t) * smoothstep(0.45, 0.95, t / dur) * 0.8
        # estalido de energia
        crack = (random.random() * 2 - 1) * math.exp(-t * 26) * 0.5
        env = env_pulse(t, 0.004, dur * 0.55, dur * 0.4, dur)
        out.append(carrier * (0.75 + 0.25 * ring) * env * 0.8 + sub * 0.6 + crack)
    return out


def synth_scream():
    dur = 1.15
    n = int(SR * dur)
    out = []
    random.seed(23)
    phase = 0.0
    for i in range(n):
        t = i / SR
        u = t / dur
        # queda de tom ao longo do grito (dor -> puro poder)
        base = 175 * (1 - 0.22 * u) + 18 * math.sin(2 * math.pi * 7.5 * t)  # vibrato
        phase += 2 * math.pi * base / SR
        saw = 2 * (phase / (2 * math.pi) - math.floor(0.5 + phase / (2 * math.pi)))
        # distorção agressiva
        dist = math.tanh(3.6 * saw)
        # rasp harmônico (segunda oitava)
        rasp = math.tanh(2.5 * math.sin(phase * 2.7 + 0.5)) * 0.4
        # ruído de sopro (diafragma)
        breath = (random.random() * 2 - 1) * 0.16
        # envelope: ataque brutal, cauda longa
        env = env_pulse(t, 0.012, dur * 0.62, dur * 0.36, dur)
        # modulação de 25 Hz (é o "sônico")
        am = 0.72 + 0.28 * math.sin(2 * math.pi * 24 * t)
        out.append((dist + rasp + breath) * env * am)
    return out


def synth_transform():
    dur = 1.6
    n = int(SR * dur)
    out = []
    chord = [523.25, 659.25, 783.99, 1046.5]  # C5 E5 G5 C6
    for i in range(n):
        t = i / SR
        u = t / dur
        # varredura ascendente de poder (sub-grave -> agudo)
        sweep_freq = 70 * (2 ** (u * 2.6))
        sweep = math.sin(2 * math.pi * sweep_freq * t) * 0.5 * (1 - smoothstep(0.55, 1.0, u))
        # acorde mayor que floresce no último terço
        chord_amp = smoothstep(0.42, 0.75, u) * (1 - smoothstep(0.86, 1.0, u) ** 2)
        chord_sig = 0.0
        for j, f in enumerate(chord):
            detune = 1.0 + 0.004 * math.sin(2 * math.pi * (3 + j) * t)
            chord_sig += math.sin(2 * math.pi * f * detune * t) * (0.30 / (j + 1) ** 0.35)
        # estalo de trovão no clímax
        boom = math.sin(2 * math.pi * 48 * t) * math.exp(-((t - 0.78) ** 2) / (2 * 0.05 ** 2)) * 0.9
        shimmer = math.sin(2 * math.pi * 3136 * t) * smoothstep(0.7, 0.9, u) * (1 - smoothstep(0.9, 1.0, u)) * 0.1
        out.append(sweep + chord_sig * chord_amp + boom + shimmer)
    return out


if __name__ == "__main__":
    write_wav("inject.wav", synth_inject())
    write_wav("laser.wav", synth_laser())
    write_wav("scream.wav", synth_scream())
    write_wav("transform.wav", synth_transform())
