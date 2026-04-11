interface Props {
  readonly pic: string;
  readonly size?: number;
}

export default function PartPicThumb({ pic, size = 32 }: Props) {
  if (!pic || pic === 'none') return null;

  if (pic.startsWith('emoji:')) {
    const emoji = pic.slice(6);
    return (
      <span
        style={{ fontSize: size * 0.8, lineHeight: 1 }}
        className="flex-shrink-0 select-none"
        aria-hidden="true"
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={pic}
      width={size}
      height={size}
      className="rounded object-cover flex-shrink-0"
      alt=""
    />
  );
}
