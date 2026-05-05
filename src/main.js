import { GameController } from './controllers/GameController.js';
import { StatsService } from './services/StatsService.js';
import { AppMenu } from './views/AppMenu.js';

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
    const controller = new GameController();
    const statsService = new StatsService();

    const appMenu = new AppMenu({
        statsService,
        onPlay: () => exitLanding(controller),
        onOpenSettings: () => {
            const filterContainer = document.getElementById('filterContainer');
            if (filterContainer) {
                filterContainer.classList.add('show');
            }
        },
        onHome: () => appMenu.updateMotivationUI()
    });

    wireLandingHero(controller, appMenu);
    wireStatsTracking(controller, statsService, appMenu);
});

function exitLanding(controller) {
    document.body.classList.remove('landing-mode');
    document.getElementById('startButton')?.click();
}

/**
 * Wires the main landing CTA and return-to-landing on game end.
 */
function wireLandingHero(controller, appMenu) {
    const body = document.body;
    const cta = document.getElementById('landingCTA');
    const startButton = document.getElementById('startButton');

    cta?.addEventListener('click', () => exitLanding(controller));

    // Return to landing when the game end modal's "Play Again" is pressed
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.classList.contains('modal-close-btn')) {
            body.classList.add('landing-mode');
            appMenu.updateMotivationUI();
        }
    });
}

/**
 * Hooks into GameController lifecycle to record stats without mutating it.
 * Wraps endGame so we capture results right before the modal is shown.
 */
function wireStatsTracking(controller, statsService, appMenu) {
    const originalEndGame = controller.endGame.bind(controller);
    controller.endGame = function patchedEndGame() {
        const scores = this.gameState.teamScores;
        const correct = (scores?.red || 0) + (scores?.green || 0);
        const wrong = scores?.blue || 0;
        const elapsed = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
        statsService.recordGame({ correct, wrong, elapsedSeconds: elapsed });
        appMenu.updateMotivationUI();
        return originalEndGame();
    };

    // Track unique countries correct when a team scores (not blue = draw)
    const originalHandleTeamScore = controller.handleTeamScore.bind(controller);
    controller.handleTeamScore = function patchedHandleTeamScore(teamColor) {
        if (teamColor !== 'blue' && this.countryInfoRevealed && this.gameState.isActive) {
            const country = this.gameService.getCurrentCountry(this.filteredCountries);
            if (country?.englishName) statsService.recordCountryCorrect(country.englishName);
        }
        return originalHandleTeamScore(teamColor);
    };
}
