// Robe colours for `look` 0..5. Shared by the join screen swatches and the 3D characters.
export interface RobeLook {
  name: string;
  /** main robe colour */
  hex: number;
  /** sash / trim colour */
  trim: number;
}

export const ROBE_LOOKS: readonly RobeLook[] = [
  { name: 'Thanh ngọc', hex: 0x3f9a82, trim: 0xe3c27a },
  { name: 'Thanh thiên', hex: 0x4a7bbd, trim: 0xe8e2c8 },
  { name: 'Tử vân', hex: 0x8467b8, trim: 0xe3c27a },
  { name: 'Xích diễm', hex: 0xb4504a, trim: 0xf0d9a0 },
  { name: 'Kim quang', hex: 0xd0a443, trim: 0x5a3a24 },
  { name: 'Nguyệt bạch', hex: 0xd9dfd6, trim: 0x3f9a82 },
];

export function cssHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}
