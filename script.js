const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const themeToggle = document.getElementById('theme-toggle');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const THEME_KEY = 'site-theme-mode';

let autoCheckInterval = null;

const closeMenu = () => {
    navMenu.classList.remove('active');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
};

if (hamburger) {
    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('active');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));

        // animate 'show' state so CSS transition plays consistently across all sizes
        if (isOpen) {
            requestAnimationFrame(() => requestAnimationFrame(() => navMenu.classList.add('show')));
        } else {
            navMenu.classList.remove('show');
        }
    });
}

// close menu (and reset hamburger) when a nav link is clicked
document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', () => {
        closeMenu();
        if (hamburger) hamburger.classList.remove('open');
        navMenu.classList.remove('show');
    });
});

// close menu when user clicks outside the overlay on desktop
document.addEventListener('click', (e) => {
    if (!navMenu.classList.contains('active')) return;
    const isClickInside = navMenu.contains(e.target) || hamburger.contains(e.target);
    if (!isClickInside) {
        navMenu.classList.remove('active', 'show');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    }
});

const isDaytime = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18;
};

const getAutoTheme = () => {
    return isDaytime() ? 'day' : 'night';
};

const applyTheme = (actualTheme) => {
    document.documentElement.setAttribute('data-theme', actualTheme);
    if (themeMeta) {
        themeMeta.setAttribute('content', actualTheme === 'night' ? '#0B0B0C' : '#F7F5F0');
    }
};

const updateToggleUI = (mode) => {
    if (!themeToggle) return;
    
    themeToggle.setAttribute('data-mode', mode);
    const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    themeToggle.setAttribute('aria-label', `Theme: ${modeLabel} (click to cycle Day, Auto, Night)`);
};

const setMode = (mode) => {
    updateToggleUI(mode);
    
    if (autoCheckInterval) {
        clearInterval(autoCheckInterval);
        autoCheckInterval = null;
    }
    
    if (mode === 'auto') {
        const autoTheme = getAutoTheme();
        applyTheme(autoTheme);
        
        autoCheckInterval = setInterval(() => {
            const currentMode = localStorage.getItem(THEME_KEY);
            if (currentMode === 'auto') {
                applyTheme(getAutoTheme());
            }
        }, 60000);
    } else {
        applyTheme(mode);
    }
};

const initTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    const mode = (saved === 'day' || saved === 'auto' || saved === 'night') ? saved : 'auto';
    localStorage.setItem(THEME_KEY, mode);
    setMode(mode);
};

if (themeToggle) {
    // compact button cycles Day → Auto → Night (aria-label updates)
    themeToggle.addEventListener('click', () => {
        const current = themeToggle.getAttribute('data-mode') || 'auto';
        const modes = ['day', 'auto', 'night'];
        const currentIndex = modes.indexOf(current);
        const next = modes[(currentIndex + 1) % modes.length];
        localStorage.setItem(THEME_KEY, next);
        setMode(next);
        themeToggle.title = `Theme: ${next.charAt(0).toUpperCase() + next.slice(1)}`;
    });
}

initTheme();

// Subtle reveal-on-scroll (respects prefers-reduced-motion)
(function setupRevealOnScroll(){
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (prefersReduce) {
        items.forEach(i => i.classList.add('visible'));
        return;
    }

    const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    items.forEach(i => io.observe(i));
})();

// Banner: local date/time + weather (Open-Meteo, no API key) — graceful fallbacks
(function setupBanner(){
    const elDate = document.getElementById('banner-date');
    const elTime = document.getElementById('banner-time');
    const elWeather = document.getElementById('banner-weather');

    const UNIT_KEY = 'weather-unit-pref';
    const unitButtons = document.querySelectorAll('.unit-btn');

    const updateClock = (tz) => {
        const now = new Date();
        const optsDate = { weekday: 'short', month: 'short', day: 'numeric' };
        const optsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        elDate.textContent = new Intl.DateTimeFormat(undefined, optsDate).format(now);
        elTime.textContent = new Intl.DateTimeFormat(undefined, optsTime).format(now);
    };

    // unit preference helpers
    const getSavedUnit = () => localStorage.getItem(UNIT_KEY) || 'both';
    const setSavedUnit = (u) => localStorage.setItem(UNIT_KEY, u);
    const applyUnitUI = () => {
        const saved = getSavedUnit();
        unitButtons.forEach(btn => {
            const is = btn.dataset.unit === saved;
            btn.setAttribute('aria-pressed', String(is));
        });
    };

    unitButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const u = btn.dataset.unit;
            setSavedUnit(u);
            applyUnitUI();
            // refresh weather display if current weather is present
            if (window._lastWeather) renderWeather(window._lastWeather);
        });
    });

    const weatherCodeToText = (code) => {
        const map = {
            0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing rime fog',
            51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
            61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
            71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
            80: 'Rain showers', 95: 'Thunderstorm'
        };
        return map[code] || 'Unknown';
    };

    const weatherCodeToIcon = (code) => {
        // simple notebook‑style SVG icons (minimal strokes) — returns a string
        if (code === 0) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 4v2M12 18v2M4 12H2M22 12h-2M5 5l-1.5-1.5M20 20l-1.5-1.5M5 19L3.5 20.5M20 4l-1.5 1.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (code === 1 || code === 2) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 15s2-4 7-4 7 4 11 3" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        if (code === 3) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="9" width="18" height="6" rx="2" stroke="currentColor" stroke-width="1.25"/></svg>';
        if ([45,48].includes(code)) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 12h16M6 8h12M8 16h8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
        if ([51,53,55,61,63,65,80].some(n=>[51,53,55,61,63,65,80].includes(code))) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 13c1-2 3-3 6-2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M9.5 17l-.5 2M14.5 17l.5 2" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
        if ([71,73,75].includes(code)) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 6v6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
        if (code === 95) return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 12h12M8 8l8 8M8 16l8-8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>';
        return '<svg class="banner-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.25"/></svg>';
    };

    const renderWeather = (cw, timezone) => {
        if (!elWeather) return;
        const tempC = Number(cw.temperature);
        const tempF = Math.round((tempC * 9/5) + 32);
        const roundedC = Math.round(tempC);
        const desc = weatherCodeToText(cw.weathercode);
        const icon = weatherCodeToIcon(cw.weathercode);
        const pref = getSavedUnit();
        let text;
        if (pref === 'F') text = `${tempF}°F`;
        else if (pref === 'C') text = `${roundedC}°C`;
        else text = `${tempF}°F / ${roundedC}°C`;
        elWeather.innerHTML = `\n            ${icon}\n            <span aria-hidden="true">${desc} • ${text}</span>\n        `;
        elWeather.setAttribute('aria-label', `${desc}, ${roundedC} degrees Celsius, ${tempF} degrees Fahrenheit`);
        // save last weather for UI refresh when unit preference changes
        window._lastWeather = cw;
    };

    const fetchWeather = (lat, lon) => {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;
        fetch(url).then(r => r.json()).then(data => {
            if (data && data.current_weather) {
                renderWeather(data.current_weather, data.timezone);
            }
        }).catch(() => {
            elWeather.textContent = '[Weather unavailable]';
        });
    };
    const useLocation = (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetchWeather(lat, lon);
    };

    const fallbackToIP = () => {
        // approximate by IP if geolocation denied
        fetch('https://ipapi.co/json/').then(r => r.json()).then(data => {
            if (data && data.latitude && data.longitude) {
                fetchWeather(data.latitude, data.longitude);
            } else {
                elWeather.textContent = '[Weather unavailable]';
            }
        }).catch(() => {
            elWeather.textContent = '[Weather unavailable]';
        });
    };

    // initialize time and weather
    updateClock();
    setInterval(() => updateClock(), 1000);

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(useLocation, () => {
            fallbackToIP();
        }, { maximumAge: 600000, timeout: 5000 });
    } else {
        fallbackToIP();
    }
})();