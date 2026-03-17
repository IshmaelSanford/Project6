/* ==========================================================================
   DOM REFERENCES
   ========================================================================== */
const secondHand = document.querySelector('.second-hand');
const minuteHand = document.querySelector('.minute-hand');
const hourHand = document.querySelector('.hour-hand');
const hourShadow = document.querySelector('.hour-shadow');
const minuteShadow = document.querySelector('.minute-shadow');
const secondShadow = document.querySelector('.second-shadow');
const clockContainer = document.querySelector('.clock-container');

const openTimezoneButton = document.getElementById('open-timezone');
const closeTimezoneButton = document.getElementById('close-timezone');
const timezoneModal = document.getElementById('timezone-modal');
const fadeLayer = document.getElementById('screen-fade');
const timezoneHoverLabel = document.getElementById('timezone-hover-label');
const currentZoneLabel = document.getElementById('current-zone');
const modeButtons = Array.from(document.querySelectorAll('.mode-btn[data-theme-mode]'));
const titleModeButtons = Array.from(document.querySelectorAll('.title-mode-btn'));
const openInterfaceButton = document.getElementById('open-interface');
const closeInterfaceButton = document.getElementById('close-interface');
const applyInterfaceButton = document.getElementById('apply-interface');
const interfacePanel = document.getElementById('interface-panel');
const styleTrack = document.getElementById('style-track');
const stylePrevButton = document.getElementById('style-prev');
const styleNextButton = document.getElementById('style-next');

const globeShell = document.getElementById('globe-shell');
const mapTrack = document.getElementById('map-track');
const timezoneStrip = document.getElementById('timezone-strip');
const mapAspectRatio = 1404.7773 / 600.81262;
const mapHeightScale = 1.08;
const timezoneCycles = 3;

/* ==========================================================================
   DATA MODELS
   ========================================================================== */
const timezones = [
    { offset: -660, name: 'UTC-11 Samoa Standard' },
    { offset: -600, name: 'UTC-10 Hawaii-Aleutian' },
    { offset: -540, name: 'UTC-9 Alaska' },
    { offset: -480, name: 'UTC-8 Pacific' },
    { offset: -420, name: 'UTC-7 Mountain' },
    { offset: -360, name: 'UTC-6 Central' },
    { offset: -300, name: 'UTC-5 Eastern' },
    { offset: -240, name: 'UTC-4 Atlantic' },
    { offset: -180, name: 'UTC-3 Brasilia' },
    { offset: -120, name: 'UTC-2 Mid-Atlantic' },
    { offset: -60, name: 'UTC-1 Azores' },
    { offset: 0, name: 'UTC Greenwich' },
    { offset: 60, name: 'UTC+1 Central Europe' },
    { offset: 120, name: 'UTC+2 Eastern Europe' },
    { offset: 180, name: 'UTC+3 East Africa' },
    { offset: 240, name: 'UTC+4 Gulf' },
    { offset: 300, name: 'UTC+5 Pakistan' },
    { offset: 360, name: 'UTC+6 Bangladesh' },
    { offset: 420, name: 'UTC+7 Indochina' },
    { offset: 480, name: 'UTC+8 China' },
    { offset: 540, name: 'UTC+9 Japan' },
    { offset: 600, name: 'UTC+10 Eastern Australia' },
    { offset: 660, name: 'UTC+11 Solomon Islands' },
    { offset: 720, name: 'UTC+12 New Zealand' }
];

const zoneButtons = [];
let selectedZoneIndex = 0;
let selectedOffsetMinutes = 0;

let audioCtx;
let tickBuffer;
let previousDisplayedSecond = null;
let secondRevolutions = 0;
let hourShadowRotation = null;
let minuteShadowRotation = null;
let secondShadowRotation = null;
let lastLocalTitleSecond = null;
let themeMode = localStorage.getItem('clock_theme_mode') || 'auto';
let titleTimeMode = localStorage.getItem('clock_title_time_mode') || 'ampm';
let resolvedThemeMode = null;
let selectedClockStyleIndex = 0;
let localTitleFormatter;
let carouselPosition = 1;
let carouselCardStep = 0;

const clockStyles = [
    { id: 'crimson-round', name: 'Crimson Round', note: 'Classic bold red face' },
    { id: 'graphite-square', name: 'Graphite Square', note: 'Rounded-square industrial' },
    { id: 'ivory-soft', name: 'Ivory Soft', note: 'Warm studio instrument' },
    { id: 'midnight-neon', name: 'Midnight Matte', note: 'Smooth low-glare dark finish' }
];
const allowedThemeModes = new Set(['auto', 'light', 'dark']);
const allowedTitleModes = new Set(['ampm', 'military']);

if (!allowedThemeModes.has(themeMode)) {
    themeMode = 'auto';
}
if (!allowedTitleModes.has(titleTimeMode)) {
    titleTimeMode = 'ampm';
}

/* ==========================================================================
   THEME + TITLE MODE
   ========================================================================== */
function refreshLocalTitleFormatter() {
    localTitleFormatter = new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: titleTimeMode === 'ampm',
        timeZoneName: 'short'
    });
}

function updateLocalDocumentTitle(localNow) {
    const second = localNow.getSeconds();
    if (second === lastLocalTitleSecond) {
        return;
    }

    lastLocalTitleSecond = second;
    document.title = localTitleFormatter.format(localNow);
}

function getAutoThemeForDate(localNow) {
    const hour = localNow.getHours();
    return (hour >= 7 && hour < 19) ? 'light' : 'dark';
}

function updateModeButtons() {
    modeButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.themeMode === themeMode);
    });
}

function updateTitleModeButtons() {
    titleModeButtons.forEach((button) => {
        button.classList.toggle('active', button.dataset.titleMode === titleTimeMode);
    });
}

function applyTitleTimeMode(mode, persist = true, localNow = new Date()) {
    if (!allowedTitleModes.has(mode)) {
        return;
    }

    titleTimeMode = mode;
    updateTitleModeButtons();
    refreshLocalTitleFormatter();
    lastLocalTitleSecond = null;
    updateLocalDocumentTitle(localNow);

    if (persist) {
        localStorage.setItem('clock_title_time_mode', mode);
    }
}

function applyResolvedTheme(resolved) {
    if (resolvedThemeMode === resolved) {
        return;
    }

    resolvedThemeMode = resolved;
    document.body.classList.toggle('theme-light', resolved === 'light');
    document.body.classList.toggle('theme-dark', resolved === 'dark');
}

function applyThemeMode(mode, persist = true, localNow = new Date()) {
    themeMode = mode;
    updateModeButtons();

    if (persist) {
        localStorage.setItem('clock_theme_mode', mode);
    }

    document.body.dataset.themeMode = mode;
    if (mode === 'auto') {
        applyResolvedTheme(getAutoThemeForDate(localNow));
    } else {
        applyResolvedTheme(mode);
    }
}

function updateAutoThemeIfNeeded(localNow) {
    if (themeMode !== 'auto') {
        return;
    }
    applyResolvedTheme(getAutoThemeForDate(localNow));
}

function formatOffset(minutes) {
    const sign = minutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function findClosestTimezoneIndex(offsetMinutes) {
    let bestIndex = 0;
    let bestDelta = Infinity;

    timezones.forEach((zone, index) => {
        const delta = Math.abs(zone.offset - offsetMinutes);
        if (delta < bestDelta) {
            bestDelta = delta;
            bestIndex = index;
        }
    });

    return bestIndex;
}

/* ==========================================================================
   TIMEZONE PICKER
   ========================================================================== */
function updateSelectedZoneVisuals() {
    zoneButtons.forEach((button) => {
        const buttonZoneIndex = Number(button.dataset.zoneIndex);
        button.classList.toggle('selected', buttonZoneIndex === selectedZoneIndex);
    });
}

function updateActiveTimezoneLabel() {
    const selectedZone = timezones[selectedZoneIndex];
    currentZoneLabel.textContent = selectedZone.name;
    timezoneHoverLabel.textContent = `Selected: ${selectedZone.name} (${formatOffset(selectedZone.offset)})`;
}

function selectTimezone(index, closeAfterSelection = false) {
    selectedZoneIndex = index;
    selectedOffsetMinutes = timezones[index].offset;
    hourShadowRotation = null;
    minuteShadowRotation = null;
    secondShadowRotation = null;
    updateSelectedZoneVisuals();
    updateActiveTimezoneLabel();

    if (closeAfterSelection) {
        closeTimezoneModal();
    }
}

function buildTimezoneZones() {
    const fragment = document.createDocumentFragment();

    for (let cycle = 0; cycle < timezoneCycles; cycle += 1) {
        timezones.forEach((zone, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'timezone-zone';
            button.dataset.zoneIndex = String(index);
            button.dataset.zoneCycle = String(cycle);
            button.setAttribute('aria-label', `Select ${zone.name}`);

            button.addEventListener('mouseenter', () => {
                timezoneHoverLabel.textContent = `${zone.name} (${formatOffset(zone.offset)})`;
            });

            button.addEventListener('mouseleave', () => {
                updateActiveTimezoneLabel();
            });

            button.addEventListener('focus', () => {
                timezoneHoverLabel.textContent = `${zone.name} (${formatOffset(zone.offset)})`;
            });

            button.addEventListener('blur', () => {
                updateActiveTimezoneLabel();
            });

            button.addEventListener('click', () => {
                selectTimezone(index, true);
            });

            zoneButtons.push(button);
            fragment.appendChild(button);
        });
    }

    timezoneStrip.appendChild(fragment);
    layoutTimezoneZones();
}

function openTimezoneModal() {
    if (document.body.classList.contains('interface-open')) {
        closeInterfacePanel();
    }
    document.body.classList.add('timezone-open');
    timezoneModal.setAttribute('aria-hidden', 'false');
}

function closeTimezoneModal() {
    document.body.classList.remove('timezone-open');
    timezoneModal.setAttribute('aria-hidden', 'true');
}

/* ==========================================================================
   AUDIO
   ========================================================================== */
async function loadTickSound() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    if (!tickBuffer) {
        try {
            const response = await fetch('../audio/tick.mp3');
            const arrayBuffer = await response.arrayBuffer();
            tickBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error('Error loading tick sound:', error);
        }
    }
}

function playTick() {
    if (!audioCtx || !tickBuffer) {
        return;
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = tickBuffer;
    source.connect(audioCtx.destination);
    source.start();
}

/* ==========================================================================
   CLOCK STYLE CAROUSEL
   ========================================================================== */
function openInterfacePanel() {
    document.body.classList.add('interface-open');
    interfacePanel.setAttribute('aria-hidden', 'false');
    measureStyleCarousel();
    syncCarouselToSelectedStyle(false);
}

function closeInterfacePanel() {
    document.body.classList.remove('interface-open');
    interfacePanel.setAttribute('aria-hidden', 'true');
}

function buildStyleCarousel() {
    const total = clockStyles.length;
    const fragment = document.createDocumentFragment();
    const loopStyles = [clockStyles[total - 1], ...clockStyles, clockStyles[0]];

    styleTrack.innerHTML = '';

    loopStyles.forEach((style, trackIndex) => {
        let realIndex = trackIndex - 1;
        if (trackIndex === 0) {
            realIndex = total - 1;
        } else if (trackIndex === total + 1) {
            realIndex = 0;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'style-card';
        button.dataset.trackIndex = String(trackIndex);
        button.dataset.styleIndex = String(realIndex);
        button.innerHTML = `<strong>${style.name}</strong><span>${style.note}</span>`;
        button.addEventListener('click', () => {
            const targetIndex = Number(button.dataset.styleIndex);
            if (!Number.isFinite(targetIndex)) {
                return;
            }
            selectedClockStyleIndex = targetIndex;
            applyClockStyleVisual(selectedClockStyleIndex, true);
            syncCarouselToSelectedStyle(true);
        });
        fragment.appendChild(button);
    });

    styleTrack.appendChild(fragment);
}

function measureStyleCarousel() {
    const firstCard = styleTrack.querySelector('.style-card');
    if (!firstCard) {
        return;
    }

    const trackStyle = window.getComputedStyle(styleTrack);
    const gap = parseFloat(trackStyle.columnGap || trackStyle.gap || '0');
    carouselCardStep = firstCard.getBoundingClientRect().width + gap;
}

function setCarouselPosition(position, animated = true) {
    if (!carouselCardStep) {
        measureStyleCarousel();
    }
    if (!carouselCardStep) {
        return false;
    }

    carouselPosition = position;
    styleTrack.style.transition = animated ? 'transform 0.38s cubic-bezier(0.2, 0.82, 0.28, 1)' : 'none';
    styleTrack.style.transform = `translate3d(${-carouselPosition * carouselCardStep}px, 0, 0)`;
    return true;
}

function updateStyleCards() {
    const cards = styleTrack.querySelectorAll('.style-card');
    cards.forEach((card) => {
        const trackIndex = Number(card.dataset.trackIndex);
        const isActive = trackIndex === carouselPosition;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
}

function syncCarouselToSelectedStyle(animated = false) {
    carouselPosition = selectedClockStyleIndex + 1;
    setCarouselPosition(carouselPosition, animated);
    updateStyleCards();
}

function applyClockStyleVisual(index, persist = true) {
    const total = clockStyles.length;
    selectedClockStyleIndex = ((index % total) + total) % total;

    clockContainer.className = 'clock-container';
    clockContainer.classList.add(`clock-style-${clockStyles[selectedClockStyleIndex].id}`);

    if (persist) {
        localStorage.setItem('clock_style_index', String(selectedClockStyleIndex));
    }
}

function slideStyleCarousel(direction) {
    const total = clockStyles.length;
    if (total < 2 || styleTrack.classList.contains('is-sliding')) {
        return;
    }

    const moved = setCarouselPosition(carouselPosition + direction, true);
    if (!moved) {
        return;
    }
    styleTrack.classList.add('is-sliding');
}

function handleCarouselTransitionEnd(event) {
    if (event.propertyName !== 'transform') {
        return;
    }

    styleTrack.classList.remove('is-sliding');
    const total = clockStyles.length;

    if (carouselPosition === 0) {
        setCarouselPosition(total, false);
    } else if (carouselPosition === total + 1) {
        setCarouselPosition(1, false);
    }

    selectedClockStyleIndex = ((carouselPosition - 1) + total) % total;
    applyClockStyleVisual(selectedClockStyleIndex, true);
    updateStyleCards();
}

/* ==========================================================================
   CLOCK LOOP
   ========================================================================== */
function updateClock() {
    const shiftedNow = Date.now() + (selectedOffsetMinutes * 60000);
    const shiftedDate = new Date(shiftedNow);
    const localNow = new Date();
    const milliseconds = shiftedDate.getUTCMilliseconds();
    const seconds = shiftedDate.getUTCSeconds();
    const minutes = shiftedDate.getUTCMinutes();
    const hours = shiftedDate.getUTCHours() % 12;

    updateLocalDocumentTitle(localNow);
    updateAutoThemeIfNeeded(localNow);

    if (previousDisplayedSecond === null) {
        previousDisplayedSecond = seconds;
    } else if (seconds !== previousDisplayedSecond) {
        if (seconds < previousDisplayedSecond) {
            secondRevolutions += 1;
        }
        previousDisplayedSecond = seconds;
        playTick();
    }

    const secondRotation = (secondRevolutions * 360) + (seconds * 6);
    const minuteRotation = (minutes * 6) + (seconds * 0.1) + (milliseconds * 0.0001);
    const hourRotation = (hours * 30) + (minutes * 0.5) + (seconds / 120);

    secondHand.style.transform = `translateX(-50%) rotate(${secondRotation}deg)`;
    minuteHand.style.transform = `translateX(-50%) rotate(${minuteRotation}deg)`;
    hourHand.style.transform = `translateX(-50%) rotate(${hourRotation}deg)`;

    if (hourShadowRotation === null) {
        hourShadowRotation = hourRotation;
        minuteShadowRotation = minuteRotation;
        secondShadowRotation = secondRotation;
    } else {
        hourShadowRotation += (hourRotation - hourShadowRotation) * 0.36;
        minuteShadowRotation += (minuteRotation - minuteShadowRotation) * 0.24;
        secondShadowRotation += (secondRotation - secondShadowRotation) * 0.14;
    }

    hourShadow.style.transform = `translateX(-50%) rotate(${hourShadowRotation}deg)`;
    minuteShadow.style.transform = `translateX(-50%) rotate(${minuteShadowRotation}deg)`;
    secondShadow.style.transform = `translateX(-50%) rotate(${secondShadowRotation}deg)`;

    requestAnimationFrame(updateClock);
}

/* ==========================================================================
   INFINITE MAP SCROLL
   ========================================================================== */
let mapPatternWidth = 0;
let mapScrollX = 0;
let targetMapVelocityX = 0;
let currentMapVelocityX = 0;

function getMapPatternWidth() {
    const trackHeight = mapTrack.clientHeight;
    if (!trackHeight) {
        return 0;
    }
    return trackHeight * mapHeightScale * mapAspectRatio;
}

function layoutTimezoneZones() {
    mapPatternWidth = getMapPatternWidth();
    if (!mapPatternWidth) {
        return;
    }

    const zoneWidth = mapPatternWidth / timezones.length;
    const stripWidth = mapPatternWidth * timezoneCycles;

    timezoneStrip.style.width = `${stripWidth}px`;
    timezoneStrip.style.left = `${-mapPatternWidth}px`;

    zoneButtons.forEach((button) => {
        const zoneIndex = Number(button.dataset.zoneIndex);
        const zoneCycle = Number(button.dataset.zoneCycle);
        button.style.left = `${(zoneCycle * mapPatternWidth) + (zoneIndex * zoneWidth)}px`;
        button.style.width = `${zoneWidth}px`;
    });

    mapScrollX = ((mapScrollX % mapPatternWidth) + mapPatternWidth) % mapPatternWidth;
}

function getEdgeVelocity(normalizedX) {
    const deadZone = 0.24;
    const maxSpeed = 4.9;
    const edgeDistance = Math.abs(normalizedX) - deadZone;
    if (edgeDistance <= 0) {
        return 0;
    }

    const normalizedEdge = Math.min(edgeDistance / (0.5 - deadZone), 1);
    const easedEdge = normalizedEdge * normalizedEdge * (3 - (2 * normalizedEdge));
    return Math.sign(normalizedX) * easedEdge * maxSpeed;
}

function onGlobeMove(event) {
    const rect = globeShell.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) - 0.5;
    targetMapVelocityX = getEdgeVelocity(normalizedX);
}

function animateMapMotion() {
    const steeringSmoothing = 0.12;
    const idleDamping = 0.88;

    currentMapVelocityX += (targetMapVelocityX - currentMapVelocityX) * steeringSmoothing;
    if (targetMapVelocityX === 0) {
        currentMapVelocityX *= idleDamping;
    }

    if (Math.abs(currentMapVelocityX) < 0.01) {
        currentMapVelocityX = 0;
    }

    mapScrollX += currentMapVelocityX;

    if (!mapPatternWidth) {
        layoutTimezoneZones();
    }

    if (mapPatternWidth > 0) {
        mapScrollX = ((mapScrollX % mapPatternWidth) + mapPatternWidth) % mapPatternWidth;
        mapTrack.style.backgroundPositionX = `${-mapScrollX}px`;
        timezoneStrip.style.transform = `translate3d(${-mapScrollX}px, 0, 0)`;
    }

    requestAnimationFrame(animateMapMotion);
}

/* ==========================================================================
   EVENT BINDINGS
   ========================================================================== */
openTimezoneButton.addEventListener('click', openTimezoneModal);
closeTimezoneButton.addEventListener('click', closeTimezoneModal);
fadeLayer.addEventListener('click', closeTimezoneModal);
timezoneModal.addEventListener('click', (event) => {
    if (event.target === timezoneModal) {
        closeTimezoneModal();
    }
});

globeShell.addEventListener('mousemove', onGlobeMove);
globeShell.addEventListener('mouseleave', () => {
    targetMapVelocityX = 0;
});

window.addEventListener('resize', layoutTimezoneZones);
window.addEventListener('resize', () => {
    measureStyleCarousel();
    syncCarouselToSelectedStyle(false);
});
window.addEventListener('load', () => {
    measureStyleCarousel();
    syncCarouselToSelectedStyle(false);
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
        return;
    }

    if (document.body.classList.contains('timezone-open')) {
        closeTimezoneModal();
    } else if (document.body.classList.contains('interface-open')) {
        closeInterfacePanel();
    }
});

const startAudio = () => {
    loadTickSound();
    document.removeEventListener('pointerdown', startAudio);
};

document.addEventListener('pointerdown', startAudio);
modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
        applyThemeMode(button.dataset.themeMode, true);
    });
});
titleModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
        applyTitleTimeMode(button.dataset.titleMode, true);
    });
});
openInterfaceButton.addEventListener('click', openInterfacePanel);
closeInterfaceButton.addEventListener('click', closeInterfacePanel);
applyInterfaceButton.addEventListener('click', closeInterfacePanel);
stylePrevButton.addEventListener('click', () => slideStyleCarousel(-1));
styleNextButton.addEventListener('click', () => slideStyleCarousel(1));
styleTrack.addEventListener('transitionend', handleCarouselTransitionEnd);

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
buildTimezoneZones();
buildStyleCarousel();

const localOffset = -new Date().getTimezoneOffset();
selectTimezone(findClosestTimezoneIndex(localOffset));
selectedClockStyleIndex = Number.parseInt(localStorage.getItem('clock_style_index') || '0', 10);
if (!Number.isInteger(selectedClockStyleIndex)) {
    selectedClockStyleIndex = 0;
}
applyClockStyleVisual(selectedClockStyleIndex, false);
refreshLocalTitleFormatter();
applyTitleTimeMode(titleTimeMode, false);
applyThemeMode(themeMode, false);
syncCarouselToSelectedStyle(false);
updateLocalDocumentTitle(new Date());

requestAnimationFrame(updateClock);
requestAnimationFrame(animateMapMotion);
