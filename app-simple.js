// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Получаем username бота из URL параметров
const urlParams = new URLSearchParams(window.location.search);
let botUsername = urlParams.get('bot');

// Если username не передан в URL, пытаемся получить из Telegram WebApp
if (!botUsername && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    botUsername = tg.initDataUnsafe.start_param;
}

// Если все еще нет, используем дефолтный
if (!botUsername) {
    botUsername = 'correct_letters_bot'; // Username бота (без @)
}

// Инициализация
document.getElementById('fileInput').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        showFileInfo(file.name);
        // Сохраняем имя файла для дальнейшего использования
        window.selectedFileName = file.name;
    }
}

function showFileInfo(fileName) {
    document.getElementById('fileName').textContent = fileName;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('uploadArea').style.display = 'none';
}

function clearFile() {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    window.selectedFileName = null;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    if (tab === 'text') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('textTab').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('voiceTab').classList.add('active');
    }
}

// Отправка файла - открываем чат с ботом
function sendFileToBot() {
    // Открываем чат с ботом
    tg.openTelegramLink(`https://t.me/${botUsername}`);
    
    tg.showAlert('📤 Откройте чат с ботом и отправьте файл. Затем вернитесь сюда для ввода требований.');
    
    // Показываем шаг 2
    setTimeout(() => {
        document.getElementById('step2').style.display = 'block';
    }, 1000);
}

// Отправка текстовых требований - открываем чат с готовым текстом
function sendTextRequirements() {
    const requirements = document.getElementById('requirementsText').value.trim();
    
    if (!requirements) {
        tg.showAlert('Пожалуйста, введите требования');
        return;
    }
    
    // Открываем чат с ботом с готовым текстом
    const encodedText = encodeURIComponent(requirements);
    tg.openTelegramLink(`https://t.me/${botUsername}?text=${encodedText}`);
    
    tg.showAlert('✅ Требования отправлены! Бот обработает документ и отправит результат.');
    
    // Закрываем Mini App через 2 секунды
    setTimeout(() => {
        tg.close();
    }, 2000);
}

function closeMiniApp() {
    tg.close();
}

