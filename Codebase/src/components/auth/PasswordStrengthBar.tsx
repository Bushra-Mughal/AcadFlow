// Minimal password strength indicator - 4-segment bar with label
interface Strength {
  score: number;       // 0-4
  label: string;
  color: string;       // Tailwind bg class (semantic-safe static string)
  labelColor: string;  // Tailwind text class
}

function evaluate(password: string): Strength {
  if (!password) return { score: 0, label: '', color: 'bg-muted', labelColor: 'text-muted-foreground' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Map raw score (0-5) to display score (1-4)
  const display = Math.min(4, Math.max(1, score));

  const levels: Record<number, Omit<Strength, 'score'>> = {
    1: { label: 'Weak',   color: 'bg-destructive',   labelColor: 'text-destructive' },
    2: { label: 'Fair',   color: 'bg-amber-400',     labelColor: 'text-amber-500' },
    3: { label: 'Good',   color: 'bg-primary',       labelColor: 'text-primary' },
    4: { label: 'Strong', color: 'bg-green-500',     labelColor: 'text-green-600' },
  };

  return { score: display, ...levels[display] };
}

interface Props {
  password: string;
}

export function PasswordStrengthBar({ password }: Props) {
  const { score, label, color, labelColor } = evaluate(password);

  if (!password) return null;

  return (
    <div className="space-y-1">
      {/* 4-segment bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((seg) => (
          <div
            key={seg}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              seg <= score ? color : 'bg-muted'
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <p className={`text-xs font-medium ${labelColor}`}>{label}</p>
    </div>
  );
}


