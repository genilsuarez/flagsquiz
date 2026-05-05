/**
 * Service for persisting user stats and achievements in localStorage.
 * Enables the motivation features (streak, achievements, progress).
 */
const STORAGE_KEY = 'flagquiz_stats_v1';

const DEFAULT_STATS = {
    gamesPlayed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    bestTimeSeconds: null,
    currentStreak: 0,
    longestStreak: 0,
    lastPlayedDate: null,
    uniqueCountriesCorrect: [],
    achievements: {
        explorer: false,    // 10 correct answers total
        sniper: false,      // 10 correct in a row in a single game
        lightning: false,   // Finish a full game under 60s
        conqueror: false,   // All countries from a continent
        persistent: false   // 7 day streak
    }
};

export class StatsService {
    constructor() {
        this.stats = this.load();
        this.updateStreakOnVisit();
    }

    load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_STATS };
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_STATS, ...parsed, achievements: { ...DEFAULT_STATS.achievements, ...(parsed.achievements || {}) } };
        } catch {
            return { ...DEFAULT_STATS };
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.stats));
        } catch {
            // Ignore storage errors (private mode, quota)
        }
    }

    getStats() {
        return { ...this.stats };
    }

    /**
     * Called on each page load. If the user opens the app on a new day:
     *  - Consecutive day → streak++
     *  - Missed days → streak resets to 0 (will become 1 on next game)
     */
    updateStreakOnVisit() {
        const today = this.today();
        if (!this.stats.lastPlayedDate) return;
        const diff = this.daysBetween(this.stats.lastPlayedDate, today);
        if (diff > 1) {
            this.stats.currentStreak = 0;
            this.save();
        }
    }

    /**
     * Called after every finished game.
     * @param {object} payload - { correct, wrong, elapsedSeconds, totalCountries }
     */
    recordGame({ correct = 0, wrong = 0, elapsedSeconds = 0 } = {}) {
        const today = this.today();
        const s = this.stats;

        s.gamesPlayed += 1;
        s.totalCorrect += correct;
        s.totalWrong += wrong;

        if (elapsedSeconds > 0 && (s.bestTimeSeconds === null || elapsedSeconds < s.bestTimeSeconds)) {
            s.bestTimeSeconds = elapsedSeconds;
        }

        // Streak: only counts if at least one correct answer today
        if (correct > 0) {
            if (s.lastPlayedDate !== today) {
                const diff = s.lastPlayedDate ? this.daysBetween(s.lastPlayedDate, today) : Infinity;
                s.currentStreak = diff === 1 ? s.currentStreak + 1 : 1;
                s.lastPlayedDate = today;
            }
            if (s.currentStreak > s.longestStreak) {
                s.longestStreak = s.currentStreak;
            }
        }

        this.checkAchievements({ correct, elapsedSeconds });
        this.save();
        return this.getStats();
    }

    recordCountryCorrect(countryCode) {
        if (!countryCode) return;
        if (!this.stats.uniqueCountriesCorrect.includes(countryCode)) {
            this.stats.uniqueCountriesCorrect.push(countryCode);
            this.save();
        }
    }

    checkAchievements({ correct, elapsedSeconds }) {
        const s = this.stats;
        const a = s.achievements;

        if (!a.explorer && s.totalCorrect >= 10) a.explorer = true;
        if (!a.sniper && correct >= 10) a.sniper = true;
        if (!a.lightning && elapsedSeconds > 0 && elapsedSeconds <= 60 && correct > 0) a.lightning = true;
        if (!a.persistent && s.currentStreak >= 7) a.persistent = true;
        // Conqueror achievement is tracked externally when a continent is completed
    }

    reset() {
        this.stats = { ...DEFAULT_STATS, achievements: { ...DEFAULT_STATS.achievements } };
        this.save();
    }

    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    daysBetween(dateA, dateB) {
        const a = new Date(dateA);
        const b = new Date(dateB);
        return Math.round((b - a) / (1000 * 60 * 60 * 24));
    }
}
