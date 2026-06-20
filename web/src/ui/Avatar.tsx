const AVATAR_TONES = ['#F3D3C7', '#CFE0E6', '#D7DEC6', '#E6D2C2', '#DDD4E6', '#E8DEC8'];

export function toneForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
}

type AvatarPreset = 'list' | 'detail' | 'chip';

const SIZES: Record<AvatarPreset, { size: number; font: number }> = {
  list:   { size: 36, font: 14 },
  detail: { size: 60, font: 23 },
  chip:   { size: 24, font: 11 },
};

export function Avatar({ id, name, preset = 'list' }: { id: string; name: string; preset?: AvatarPreset }) {
  const { size, font } = SIZES[preset];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: toneForId(id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-serif)', fontSize: font, color: 'var(--ink-soft)', flex: 'none',
    }}>
      {initials(name)}
    </div>
  );
}
