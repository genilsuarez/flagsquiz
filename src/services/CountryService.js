import { Country } from '../models/Country.js';

/**
 * Service for managing country data operations
 */
export class CountryService {
    constructor() {
        this.countries = [];
    }

    async loadCountries() {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}assets/data/flags.json`);
            const data = await response.json();
            this.countries = data.map(countryData => {
                const country = new Country(countryData);
                country.capital = countryData.Capital_Spanish || 'Desconocida';
                return country;
            });
            return this.countries;
        } catch (error) {
            console.error('Error loading countries:', error);
            throw new Error('Failed to load country data');
        }
    }

    filterCountries(filters = {}) {
        let filtered = [...this.countries];

        if (filters.continent && filters.continent !== 'All') {
            filtered = filtered.filter(country => country.continent === filters.continent);
        }

        if (filters.sovereigntyStatus && filters.sovereigntyStatus !== 'All') {
            const isSovereign = filters.sovereigntyStatus === 'Yes';
            filtered = filtered.filter(country => country.isSovereign === isSovereign);
        }

        if (filters.maxCount && filters.maxCount > 0) {
            filtered = filtered.slice(0, filters.maxCount);
        }

        return filtered;
    }

    getAvailableContinents() {
        const continents = new Set(this.countries.map(country => country.continent));
        return ['All', ...Array.from(continents).sort()];
    }

    getCountryCount(filters = {}) {
        return this.filterCountries(filters).length;
    }

    getMaxCountryCount(filters = {}) {
        let filtered = [...this.countries];

        if (filters.continent && filters.continent !== 'All') {
            filtered = filtered.filter(country => country.continent === filters.continent);
        }

        if (filters.sovereigntyStatus && filters.sovereigntyStatus !== 'All') {
            const isSovereign = filters.sovereigntyStatus === 'Yes';
            filtered = filtered.filter(country => country.isSovereign === isSovereign);
        }

        // No aplicar maxCount aquí para obtener el límite real
        return filtered.length;
    }
}