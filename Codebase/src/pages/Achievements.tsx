import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/db/supabase';
import type { UserBadge, UserStats, BadgeProgress } from '@/types';
import {
  Award,
  CheckCircle,
  Crown,
  FileCode,
  FileEdit,
  FilePenLine,
  Flame,
  Medal,
  Rocket,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  CheckCircle,
  Target,
  Award,
  Crown,
  Star,
  Sparkles,
  Trophy,
  FileEdit,
  FilePenLine,
  FileCode,
  Flame,
  Zap,
  Rocket,
  Medal,
};

export default function Achievements() {
  const [badges, setBadges] = useState<BadgeProgress[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user stats
      const { data: statsData } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setStats(statsData);

      // Load all badges
      const { data: badgesData } = await supabase
        .from('badges')
        .select('*')
        .order('display_order');

      // Load user's unlocked badges
      const { data: userBadgesData } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id);

      // Combine data
      const badgeProgress: BadgeProgress[] = (badgesData || []).map(badge => {
        const userBadge = (userBadgesData || []).find((ub: UserBadge) => ub.badge_id === badge.id);
        const currentValue = getCurrentValue(badge.criteria_type, statsData);
        const progress = Math.min(100, (currentValue / badge.criteria_value) * 100);

        return {
          ...badge,
          unlocked: !!userBadge,
          progress,
          unlocked_at: userBadge?.unlocked_at,
        };
      });

      setBadges(badgeProgress);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }

  function getCurrentValue(criteriaType: string, stats: UserStats | null): number {
    if (!stats) return 0;
    switch (criteriaType) {
      case 'on_time_submissions':
        return stats.on_time_submissions;
      case 'rank':
        return stats.rank;
      case 'file_edits':
        return stats.file_edits;
      case 'streak':
        return stats.longest_streak;
      case 'total_submissions':
        return stats.total_submissions;
      default:
        return 0;
    }
  }

  const filteredBadges = badges.filter(badge => {
    if (filter === 'unlocked') return badge.unlocked;
    if (filter === 'locked') return !badge.unlocked;
    return true;
  });

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-balance">Achievements</h1>
          <p className="text-muted-foreground text-pretty">Loading your achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-balance">Achievements</h1>
        <p className="text-muted-foreground text-pretty">
          Unlock badges by completing milestones and challenges
        </p>
      </div>

      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Your Progress</CardTitle>
          <CardDescription className="text-pretty">
            {unlockedCount} of {totalCount} badges unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={(unlockedCount / totalCount) * 100} />
            <p className="text-sm text-muted-foreground">
              {totalCount - unlockedCount} badges remaining
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All ({totalCount})
        </Button>
        <Button
          variant={filter === 'unlocked' ? 'default' : 'outline'}
          onClick={() => setFilter('unlocked')}
        >
          Unlocked ({unlockedCount})
        </Button>
        <Button
          variant={filter === 'locked' ? 'default' : 'outline'}
          onClick={() => setFilter('locked')}
        >
          Locked ({totalCount - unlockedCount})
        </Button>
      </div>

      {/* Badges Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredBadges.map(badge => {
          const Icon = iconMap[badge.icon] || Award;
          const currentValue = getCurrentValue(badge.criteria_type, stats);

          return (
            <Card
              key={badge.id}
              className={`h-full ${badge.unlocked ? 'border-primary' : 'opacity-60'}`}
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      badge.unlocked
                        ? 'bg-gradient-to-br from-primary to-primary/80'
                        : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        badge.unlocked ? 'text-primary-foreground' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base text-balance">{badge.name}</CardTitle>
                    <CardDescription className="text-pretty">{badge.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {badge.unlocked ? (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span>Unlocked!</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {currentValue} / {badge.criteria_value}
                      </span>
                    </div>
                    <Progress value={badge.progress} />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredBadges.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No badges found with the selected filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


