interface UrgencyStarsProps {
  stars: number;
}

export function UrgencyStars({ stars }: UrgencyStarsProps) {
  return (
    <span className="text-amber-500" aria-label={`緊急度 ${stars}`}>
      {'★'.repeat(stars)}
      {'☆'.repeat(Math.max(0, 5 - stars))}
    </span>
  );
}
