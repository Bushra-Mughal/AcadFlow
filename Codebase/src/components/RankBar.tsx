import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import type { UserStats, BadgeProgress } from '@/types';
import {
  Trophy, Share2, TrendingUp, Award,
  CheckCircle, Target, Crown, Star, Sparkles,
  FileEdit, Flame, Zap, Rocket, Medal,
  FilePenLine, FileCode,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// â”€â”€ Rank metadata â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface RankInfo {
  rank: number;
  title: string;
  minPoints: number;
  maxPoints: number | null;
  color: string;         // gradient classes
  badgeColor: string;    // solid bg class for badge ring
}

export const RANKS: RankInfo[] = [
  { rank: 1, title: 'Beginner',  minPoints: 0,    maxPoints: 99,   color: 'from-slate-400 to-slate-500',     badgeColor: 'bg-slate-400'   },
  { rank: 2, title: 'Learner',   minPoints: 100,  maxPoints: 249,  color: 'from-emerald-400 to-teal-500',    badgeColor: 'bg-emerald-400' },
  { rank: 3, title: 'Achiever',  minPoints: 250,  maxPoints: 499,  color: 'from-sky-400 to-blue-500',        badgeColor: 'bg-sky-400'     },
  { rank: 4, title: 'Expert',    minPoints: 500,  maxPoints: 999,  color: 'from-violet-500 to-purple-600',   badgeColor: 'bg-violet-500'  },
  { rank: 5, title: 'Master',    minPoints: 1000, maxPoints: 1999, color: 'from-amber-400 to-orange-500',    badgeColor: 'bg-amber-400'   },
  { rank: 6, title: 'Champion',  minPoints: 2000, maxPoints: 3999, color: 'from-rose-500 to-pink-600',       badgeColor: 'bg-rose-500'    },
  { rank: 7, title: 'Legend',    minPoints: 4000, maxPoints: null, color: 'from-yellow-400 to-amber-500',    badgeColor: 'bg-yellow-400'  },
];

export function getRankInfo(rank: number): RankInfo {
  return RANKS.find(r => r.rank === rank) ?? RANKS[0];
}

export function getRankProgress(points: number, rank: number): { pct: number; needed: number; current: number } {
  const info = getRankInfo(rank);
  const next = RANKS.find(r => r.rank === rank + 1);
  if (!next) return { pct: 100, needed: 0, current: points - info.minPoints };
  const span = next.minPoints - info.minPoints;
  const done = Math.max(0, points - info.minPoints);
  return {
    pct: Math.min(100, (done / span) * 100),
    needed: next.minPoints - points,
    current: done,
  };
}

const iconMap: Record<string, any> = {
  CheckCircle, Target, Award, Crown, Star, Sparkles,
  Trophy, FileEdit, FilePenLine, FileCode, Flame, Zap, Rocket, Medal,
};

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RankBar() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [topBadge, setTopBadge] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load or create stats
      let { data: statsData, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!statsData) {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({ user_id: user.id })
          .select()
          .single();
        if (insertError) throw insertError;
        statsData = newStats;
      }
      setStats(statsData);

      // Highest unlocked badge
      const { data: badgesData } = await supabase
        .from('badges')
        .select('*')
        .order('display_order', { ascending: false });

      const { data: userBadgesData } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      if (badgesData && userBadgesData) {
        const unlockedIds = new Set(userBadgesData.map((ub: any) => ub.badge_id));
        const top = badgesData.find((b: any) => unlockedIds.has(b.id));
        if (top) {
          setTopBadge({ ...top, unlocked: true, progress: 100 });
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }

  function buildLinkedInText() {
    if (!stats) return '';
    const ri = getRankInfo(stats.rank);
    const badgeLine = topBadge ? `\nBadge earned: ${topBadge.name}` : '';
    return (
      `Academic milestone unlocked on AcadFlow!\n\n` +
      `Rank: ${ri.rank} - ${ri.title}${badgeLine}\n` +
      `Points: ${stats.points ?? stats.coins * 5}\n\n` +
      `Tracking every assignment, project & deadline - consistency is key!\n\n` +
      `#AcadFlow #StudentLife #AcademicGoals #TimeManagement`
    );
  }

  async function shareToLinkedIn() {
    const text = buildLinkedInText();
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}&summary=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  async function copyShareText() {
    await navigator.clipboard.writeText(buildLinkedInText() + `\n\n${window.location.origin}`);
    toast.success('Share text copied!');
  }

  if (loading || !stats) {
    return (
      <Card className="p-4">
        <div className="h-20 animate-pulse bg-muted rounded" />
      </Card>
    );
  }

  const ri = getRankInfo(stats.rank);
  const effectivePoints = stats.points ?? stats.coins * 5;
  const prog = getRankProgress(effectivePoints, stats.rank);
  const BadgeIcon = topBadge ? (iconMap[topBadge.icon] ?? Award) : Trophy;
  const isLegend = stats.rank >= 7;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${ri.color} shadow-sm`}>
            {topBadge ? (
              <BadgeIcon className="h-7 w-7 text-white" />
            ) : (
              <Trophy className="h-7 w-7 text-white" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Rank {stats.rank}
          </span>
        </div>

        {/* Info + Progress */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold leading-tight text-balance">{ri.title}</h3>
              {topBadge && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Award className="h-3 w-3" />
                  <span>{topBadge.name}</span>
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm font-medium shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>{effectivePoints.toLocaleString()} pts</span>
            </div>
          </div>

          <div className="space-y-1">
            <Progress value={prog.pct} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              {isLegend
                ? 'Maximum rank reached - Legend status!'
                : `${prog.needed} pts to Rank ${stats.rank + 1} (${RANKS[stats.rank]?.title ?? ''})`}
            </p>
          </div>

          {/* Mini stats */}
          <div className="flex gap-4 pt-1">
            <div className="text-center">
              <p className="text-sm font-semibold">{stats.on_time_submissions}</p>
              <p className="text-[10px] text-muted-foreground">On-time</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{stats.assignments_completed ?? stats.total_submissions}</p>
              <p className="text-[10px] text-muted-foreground">Assignments</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{stats.projects_completed ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Projects</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">{stats.team_members_invited ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Invited</p>
            </div>
          </div>
        </div>

        {/* Share Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 mt-1">
              <Share2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-balance">Share Your Achievement</DialogTitle>
              <DialogDescription className="text-pretty">
                Share your rank and badge on LinkedIn to inspire peers.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Preview card */}
              <Card className="p-5 bg-muted/40">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${ri.color}`}>
                    <BadgeIcon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">AcadFlow Rank</p>
                    <h3 className="text-2xl font-bold text-balance">{ri.title}</h3>
                    <p className="text-sm text-muted-foreground">Rank {stats.rank} â€¢ {effectivePoints.toLocaleString()} points</p>
                  </div>
                </div>
                {topBadge && (
                  <div className="flex items-center gap-2 border-t pt-3">
                    <Award className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{topBadge.name}</p>
                      <p className="text-xs text-muted-foreground text-pretty">{topBadge.description}</p>
                    </div>
                  </div>
                )}
                <div className="mt-3 grid grid-cols-4 gap-3 text-center border-t pt-3">
                  <div>
                    <p className="text-lg font-bold">{stats.on_time_submissions}</p>
                    <p className="text-[10px] text-muted-foreground">On-time</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.assignments_completed ?? stats.total_submissions}</p>
                    <p className="text-[10px] text-muted-foreground">Assignments</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.projects_completed ?? 0}</p>
                    <p className="text-[10px] text-muted-foreground">Projects</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{stats.file_edits}</p>
                    <p className="text-[10px] text-muted-foreground">Edits</p>
                  </div>
                </div>
              </Card>

              <div className="flex flex-col gap-2">
                <Button onClick={shareToLinkedIn} className="w-full">
                  Post to LinkedIn
                </Button>
                <Button onClick={copyShareText} variant="outline" className="w-full">
                  Copy Post Text
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
}


