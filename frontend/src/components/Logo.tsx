export function Logo({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-extrabold tracking-tight text-[#191919] dark:text-white select-none ${className}`}
      style={{ letterSpacing: '-0.03em' }}
    >
      Typeform
    </span>
  );
}
