"""Writes a QR code for a short link as an SVG: byte mode, error correction M, versions 1 to 4 (up to 62 bytes).
No libraries, so the demo's end card needs nothing extra to build.

python3 tools/qr.py https://apps.apple.com/app/id6819309538 apps/preview/public/media/chengel-promo/qr.svg
"""
import sys

# Per version at level M: (total codewords, error correction codewords per block, blocks), alignment centre.
VERSIONS = {1: (26, 10, 1, None), 2: (44, 16, 1, 18), 3: (70, 26, 1, 22), 4: (100, 18, 2, 26)}

# GF(256) with the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.
EXP, LOG = [0] * 512, [0] * 256
x = 1
for i in range(255):
    EXP[i], LOG[x] = x, i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
for i in range(255, 512):
    EXP[i] = EXP[i - 255]


def mul(a, b):
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def ecc(data, n):
    gen = [1]
    for i in range(n):
        gen = [a ^ mul(b, EXP[i]) for a, b in zip(gen + [0], [0] + gen)]
    rem = list(data) + [0] * n
    for i in range(len(data)):
        c = rem[i]
        if c:
            for j in range(1, n + 1):
                rem[i + j] ^= mul(gen[j], c)
    return rem[len(data):]


def codewords(text, version):
    total, ec, blocks, _ = VERSIONS[version]
    capacity = total - ec * blocks
    data = text.encode('utf-8')
    bits = '0100' + format(len(data), '08b') + ''.join(format(b, '08b') for b in data)
    bits += '0' * min(4, capacity * 8 - len(bits))
    bits += '0' * (-len(bits) % 8)
    words = [int(bits[i:i + 8], 2) for i in range(0, len(bits), 8)]
    pad = [0xEC, 0x11]
    while len(words) < capacity:
        words.append(pad[(len(words) - len(bits) // 8) % 2])
    size = capacity // blocks
    groups = [words[i * size:(i + 1) * size] for i in range(blocks)]
    checks = [ecc(g, ec) for g in groups]
    # Interleave the blocks: first codeword of each, then the second, and so on.
    return [g[i] for i in range(size) for g in groups] + [c[i] for i in range(ec) for c in checks]


def matrix(text):
    version = next(v for v in VERSIONS if len(text.encode()) <= VERSIONS[v][0] - VERSIONS[v][1] * VERSIONS[v][2] - 2)
    n = 17 + 4 * version
    grid = [[None] * n for _ in range(n)]

    def put(r, c, v):
        if 0 <= r < n and 0 <= c < n:
            grid[r][c] = v

    for r0, c0 in ((0, 0), (0, n - 7), (n - 7, 0)):
        for r in range(-1, 8):
            for c in range(-1, 8):
                inside = 0 <= r <= 6 and 0 <= c <= 6
                ring = r in (0, 6) or c in (0, 6)
                core = 2 <= r <= 4 and 2 <= c <= 4
                put(r0 + r, c0 + c, inside and (ring or core))
    for i in range(8, n - 8):
        grid[6][i] = grid[i][6] = i % 2 == 0
    centre = VERSIONS[version][3]
    if centre:
        for r in range(-2, 3):
            for c in range(-2, 3):
                grid[centre + r][centre + c] = max(abs(r), abs(c)) != 1
    grid[n - 8][8] = True
    # Reserve the format areas so the data skips them.
    for i in range(9):
        for r, c in ((8, i), (i, 8)):
            if grid[r][c] is None:
                grid[r][c] = False
    for i in range(8):
        grid[8][n - 1 - i] = False
        grid[n - 1 - i][8] = False
    reserved = [[v is not None for v in row] for row in grid]

    bits = ''.join(format(w, '08b') for w in codewords(text, version))
    k = 0
    col = n - 1
    upward = True
    while col > 0:
        if col == 6:
            col -= 1
        rows = range(n - 1, -1, -1) if upward else range(n)
        for r in rows:
            for c in (col, col - 1):
                if not reserved[r][c]:
                    grid[r][c] = k < len(bits) and bits[k] == '1'
                    k += 1
        upward = not upward
        col -= 2
    return grid, reserved, n


MASKS = [
    lambda r, c: (r + c) % 2 == 0,
    lambda r, c: r % 2 == 0,
    lambda r, c: c % 3 == 0,
    lambda r, c: (r + c) % 3 == 0,
    lambda r, c: (r // 2 + c // 3) % 2 == 0,
    lambda r, c: (r * c) % 2 + (r * c) % 3 == 0,
    lambda r, c: ((r * c) % 2 + (r * c) % 3) % 2 == 0,
    lambda r, c: ((r + c) % 2 + (r * c) % 3) % 2 == 0,
]


def format_bits(mask):
    data = (0b00 << 3) | mask  # level M is 00
    rem = data << 10
    for i in range(14, 9, -1):
        if rem & (1 << i):
            rem ^= 0x537 << (i - 10)
    return ((data << 10) | rem) ^ 0x5412


def apply(grid, reserved, n, mask):
    out = [[(not reserved[r][c] and MASKS[mask](r, c)) != grid[r][c] for c in range(n)] for r in range(n)]
    f = format_bits(mask)
    bit = lambda i: bool((f >> i) & 1)
    for i in range(6):
        out[8][i] = bit(14 - i)
        out[i][8] = bit(i)
    out[8][7], out[8][8], out[7][8] = bit(8), bit(7), bit(6)
    for i in range(7):
        out[n - 1 - i][8] = bit(14 - i)
    for i in range(8):
        out[8][n - 8 + i] = bit(7 - i)
    out[n - 8][8] = True
    return out


def penalty(m, n):
    score = 0
    lines = m + [list(col) for col in zip(*m)]
    for line in lines:
        run = 1
        for i in range(1, n + 1):
            if i < n and line[i] == line[i - 1]:
                run += 1
            else:
                if run >= 5:
                    score += run - 2
                run = 1
        s = ''.join('1' if v else '0' for v in line)
        score += 40 * (s.count('10111010000') + s.count('00001011101'))
    for r in range(n - 1):
        for c in range(n - 1):
            if m[r][c] == m[r][c + 1] == m[r + 1][c] == m[r + 1][c + 1]:
                score += 3
    dark = sum(map(sum, m)) * 100 // (n * n)
    return score + abs(dark - 50) // 5 * 10


def svg(text):
    grid, reserved, n = matrix(text)
    best = min(range(8), key=lambda k: penalty(apply(grid, reserved, n, k), n))
    m = apply(grid, reserved, n, best)
    q = 4  # the quiet zone, in modules
    path = ''.join(f'M{c + q} {r + q}h1v1h-1z' for r in range(n) for c in range(n) if m[r][c])
    size = n + 2 * q
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">'
            f'<rect width="{size}" height="{size}" fill="#fff"/><path d="{path}" fill="#202020"/></svg>\n')


if __name__ == '__main__':
    with open(sys.argv[2], 'w') as f:
        f.write(svg(sys.argv[1]))
