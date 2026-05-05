/**
 * Service for managing game logic and operations
 */
export class GameService {
    constructor(gameState) {
        this.gameState = gameState;
    }

    generateGameSequence(countries) {
        const len = countries.length;
        const indices = new Array(len);
        for (let i = 0; i < len; i++) indices[i] = i;
        
        if (this.gameState.isRandomMode) {
            // Fisher-Yates shuffle inline
            for (let i = len - 1; i > 0; i--) {
                const j = (Math.random() * (i + 1)) | 0;
                const tmp = indices[i];
                indices[i] = indices[j];
                indices[j] = tmp;
            }
        }
        
        this.gameState.gameSequence = indices;
        return indices;
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));
            [array[i], array[randomIndex]] = [array[randomIndex], array[i]];
        }
    }

    startGame(countries) {
        this.gameState.reset();
        this.gameState.isActive = true;
        this.generateGameSequence(countries);
    }

    endGame() {
        this.gameState.isActive = false;
    }

    processTeamScore(teamColor) {
        if (this.gameState.isActive && this.gameState.hasNextFlag) {
            this.gameState.incrementTeamScore(teamColor);
            this.gameState.nextFlag();
            return true;
        }
        return false;
    }

    getCurrentCountry(countries) {
        if (!this.gameState.hasNextFlag) return null;
        
        const currentSequenceIndex = this.gameState.gameSequence[this.gameState.currentIndex];
        return countries[currentSequenceIndex];
    }
}