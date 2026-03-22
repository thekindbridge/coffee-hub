type SteamEffectProps = {
  className?: string;
};

export const SteamEffect = ({ className = '' }: SteamEffectProps) => (
  <div className={`pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-end gap-2 ${className}`}>
    {[...Array(5)].map((_, index) => (
      <span
        key={index}
        className="auth-steam-particle block rounded-full bg-[linear-gradient(180deg,rgba(255,247,240,0.88),rgba(255,255,255,0.08))] blur-[1.5px]"
        style={{
          width: `${4 + (index % 3)}px`,
          height: `${28 + index * 7}px`,
          animationDelay: `${index * 0.28}s`,
          animationDuration: `${2.35 + index * 0.18}s`,
          ['--steam-drift' as never]: `${(index - 2) * 9}px`,
        }}
      />
    ))}
  </div>
);
