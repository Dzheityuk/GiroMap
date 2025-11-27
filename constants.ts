

// Earth radius in meters
export const EARTH_RADIUS = 6378137;

// OpenStreetMap Tiles (Standard) - We will invert these with CSS for Dark Mode with visible text
export const TILE_LAYER_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

// Default Start (Moscow Red Square roughly, if Geo fails)
export const DEFAULT_CENTER = { lat: 55.7539, lng: 37.6208 };

// Step Length (Average in meters)
export const STEP_LENGTH = 0.76;

// Sensor Thresholds
export const MOTION_THRESHOLD = 1.2; // G-force variance to count a step

export const TRANSLATIONS = {
  RU: {
    dist: 'Дистанция',
    azimuth: 'Азимут',
    steps: 'Шаги',
    target: 'Цель',
    notSet: 'НЕ ЗАДАНА',
    allowSensors: 'РАЗРЕШИТЬ ДАТЧИКИ',
    start: 'ПОЕХАЛИ',
    correct: 'Я ЗДЕСЬ',
    stop: 'СТОП',
    return: 'НАЗАД',
    finished: 'Маршрут завершен',
    newRoute: 'НОВЫЙ МАРШРУТ',
    correctionTitle: 'Коррекция Позиции',
    correctionDesc: 'Введите адрес, где вы находитесь (GPS игнорируется).',
    placeholderAddr: 'Например: Ленина 5',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    searchFrom: 'ОТКУДА (Текущая позиция)',
    searchTo: 'КУДА (Адрес финиша)',
    searchBtn: 'ПОИСК...',
    routeBtn: 'ПОСТРОИТЬ МАРШРУТ',
    planRouteHeader: 'ПЛАНИРОВАНИЕ',
    pickA: 'Нажмите на карту, чтобы выбрать точку А',
    pickB: 'Нажмите на карту, чтобы выбрать точку Б',
    pickCorrect: 'Нажмите на карту для коррекции',
    pickOnMapBtn: 'УКАЗАТЬ НА КАРТЕ',
    tapMapHint: 'НАЖМИТЕ НА КАРТУ ДЛЯ ВЫБОРА',
    stopConfirmTitle: 'ЗАВЕРШИТЬ?',
    stopConfirmDesc: 'Завершить или вернуться по следам?',
    yes: 'ЗАВЕРШИТЬ',
    no: 'ОТМЕНА',
    gpsOn: 'GPS: ВКЛ',
    gpsOff: 'GPS: ВЫКЛ',
    geoError: 'Не удалось найти точку назначения',
    correctionError: 'Не удалось найти адрес для коррекции',
    byAuthor: 'BY DZHEITYUK',
    imHere: 'Я ТУТ',
    toHere: 'СЮДА',
    calib: 'КАЛИБР',
    modeNorth: 'СЕВЕР',
    modeHead: 'КУРС'
  },
  EN: {
    dist: 'Distance',
    azimuth: 'Azimuth',
    steps: 'Steps',
    target: 'Target',
    notSet: 'NOT SET',
    allowSensors: 'ALLOW SENSORS',
    start: 'LET\'S GO',
    correct: 'I AM HERE',
    stop: 'STOP',
    return: 'RETURN',
    finished: 'Route Finished',
    newRoute: 'NEW ROUTE',
    correctionTitle: 'Position Correction',
    correctionDesc: 'Enter your current address (GPS ignored).',
    placeholderAddr: 'e.g. Main St 5',
    cancel: 'Cancel',
    confirm: 'Confirm',
    searchFrom: 'FROM (Current Loc)',
    searchTo: 'TO (Destination)',
    searchBtn: 'SEARCHING...',
    routeBtn: 'BUILD ROUTE',
    planRouteHeader: 'PLAN ROUTE',
    pickA: 'Tap map to pick Point A',
    pickB: 'Tap map to pick Point B',
    pickCorrect: 'Tap map to correct location',
    pickOnMapBtn: 'PICK ON MAP',
    tapMapHint: 'TAP MAP TO SELECT LOCATION',
    stopConfirmTitle: 'FINISH ROUTE?',
    stopConfirmDesc: 'Finish or Backtrack?',
    yes: 'FINISH',
    no: 'CANCEL',
    gpsOn: 'GPS: ON',
    gpsOff: 'GPS: OFF',
    geoError: 'Failed to find destination',
    correctionError: 'Failed to find correction address',
    byAuthor: 'BY DZHEITYUK',
    imHere: 'I\'M HERE',
    toHere: 'TO HERE',
    calib: 'CALIB',
    modeNorth: 'NORTH',
    modeHead: 'HEAD'
  }
};