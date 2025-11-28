

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
    steps: 'ШАГИ',
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
    correctionDesc: 'Наведите центр карты или введите адрес.',
    placeholderAddr: 'Или введите адрес...',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    searchFrom: 'ОТКУДА (Текущая позиция)',
    searchTo: 'КУДА (Адрес финиша)',
    searchBtn: 'ПОИСК...',
    routeBtn: 'ПОСТРОИТЬ МАРШРУТ',
    planRouteHeader: 'ПЛАНИРОВАНИЕ',
    pickA: 'Нажмите на карту, чтобы выбрать точку А',
    pickB: 'Нажмите на карту, чтобы выбрать точку Б',
    pickCorrect: 'Наведите центр на точку',
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
    hereBtn: 'Я ТУТ (ПО ЦЕНТРУ)',
    calib: 'ЗАФИКСИРОВАТЬ КУРС',
    unlock: 'РАЗБЛОКИРОВАТЬ',
    resetPath: 'СБРОС ПУТИ',
    help: 'ИНСТРУКЦИЯ',
    helpTitle: 'КАК ПОЛЬЗОВАТЬСЯ',
    helpText: [
      '1. ПОИСК: Нажмите на лупу, выберите точку А и Б.',
      '2. КУРС: Вращайте карту (джойстиком или двумя пальцами), чтобы выровнять маршрут "перед собой".',
      '3. ФИКСАЦИЯ: Нажмите "ЗАФИКСИРОВАТЬ КУРС". Карта застынет.',
      '4. ДВИЖЕНИЕ: Идите вперед. Датчики будут двигать вас строго по линии маршрута.',
      '5. КОРРЕКЦИЯ: Если сбились, жмите "Я ЗДЕСЬ". Наведите перекрестие на ваше местоположение и нажмите "Я ТУТ", либо введите адрес.'
    ]
  },
  EN: {
    dist: 'Distance',
    azimuth: 'Azimuth',
    steps: 'STEPS',
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
    correctionDesc: 'Aim map center or enter address.',
    placeholderAddr: 'Or enter address...',
    cancel: 'Cancel',
    confirm: 'Confirm',
    searchFrom: 'FROM (Current Loc)',
    searchTo: 'TO (Destination)',
    searchBtn: 'SEARCHING...',
    routeBtn: 'BUILD ROUTE',
    planRouteHeader: 'PLAN ROUTE',
    pickA: 'Tap map to pick Point A',
    pickB: 'Tap map to pick Point B',
    pickCorrect: 'Aim center at location',
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
    hereBtn: 'I\'M HERE (CENTER)',
    calib: 'LOCK COURSE',
    unlock: 'UNLOCK MAP',
    resetPath: 'RESET PATH',
    help: 'HELP',
    helpTitle: 'HOW TO USE',
    helpText: [
      '1. SEARCH: Tap magnifier, pick Point A and B.',
      '2. HEADING: Rotate map (joystick or two fingers) to align route "forward".',
      '3. LOCK: Tap "LOCK COURSE". Map will freeze.',
      '4. WALK: Move forward. Sensors will move you strictly along the blue line.',
      '5. CORRECT: Tap "I AM HERE". Aim the crosshair at your real location and tap "I\'M HERE", or type an address below.'
    ]
  }
};