// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Получаем username бота и токен из URL параметров
const urlParams = new URLSearchParams(window.location.search);
let botUsername = urlParams.get('bot');
const botToken = urlParams.get('token'); // Опционально: токен для прямой отправки файлов

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

// Отправка файла через Telegram Bot API
async function sendFileToBot() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        tg.showAlert('Пожалуйста, выберите файл');
        return;
    }
    
    // Получаем данные пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        tg.showAlert('Ошибка: не удалось получить данные пользователя');
        return;
    }
    
    const chatId = user.id;
    
    // Показываем индикатор загрузки
    tg.MainButton.setText('📤 Отправка файла...');
    tg.MainButton.show();
    tg.MainButton.disable();
    
    try {
        // Читаем файл
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result.split(',')[1];
            
            // Отправляем файл через Telegram Bot API
            // Нужен токен бота - используем переменную окружения или webhook
            // Для безопасности используем webhook в n8n
            
            // Вариант 1: Webhook в n8n (если настроен)
            // Раскомментируйте и укажите ваш webhook URL:
            /*
            const webhookUrl = 'https://ВАШ-N8N-URL/webhook/telegram-mini-app-file';
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chatId', chatId);
            formData.append('fileName', file.name);
            
            try {
                const response = await fetch(webhookUrl, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    tg.MainButton.hide();
                    tg.showAlert('✅ Файл успешно отправлен! Теперь введите требования.');
                    setTimeout(() => {
                        document.getElementById('step2').style.display = 'block';
                    }, 1000);
                    return;
                }
            } catch (error) {
                console.error('Ошибка отправки через webhook:', error);
            }
            */
            
            // Вариант 2: Отправка через Telegram Bot API напрямую (если есть токен)
            if (botToken) {
                try {
                    const formData = new FormData();
                    formData.append('document', file);
                    formData.append('chat_id', chatId);
                    
                    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const result = await response.json();
                    
                    if (result.ok) {
                        tg.MainButton.hide();
                        tg.showAlert('✅ Файл успешно отправлен боту! Теперь введите требования.');
                        setTimeout(() => {
                            document.getElementById('step2').style.display = 'block';
                            document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
                        }, 1000);
                        return;
                    } else {
                        throw new Error(result.description || 'Ошибка отправки файла');
                    }
                } catch (error) {
                    console.error('Ошибка отправки через Bot API:', error);
                    // Fallback на ручную отправку
                }
            }
            
            // Вариант 3: Ручная отправка (если нет токена или webhook)
            tg.MainButton.hide();
            tg.showAlert('📤 Откройте чат с ботом и отправьте файл. После отправки вернитесь сюда для ввода требований.');
            
            // Открываем чат с ботом
            tg.openTelegramLink(`https://t.me/${botUsername}`);
            
            // Показываем шаг 2 через 2 секунды (пользователь вернется)
            setTimeout(() => {
                document.getElementById('step2').style.display = 'block';
                tg.MainButton.setText('✅ Файл отправлен, ввести требования');
                tg.MainButton.onClick(() => {
                    document.getElementById('step2').scrollIntoView({ behavior: 'smooth' });
                });
                tg.MainButton.show();
                tg.MainButton.enable();
            }, 2000);
        };
        
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Ошибка:', error);
        tg.MainButton.hide();
        tg.showAlert('Ошибка при подготовке файла. Попробуйте отправить файл боту вручную.');
        tg.openTelegramLink(`https://t.me/${botUsername}`);
    }
}

// Отправка текстовых требований - автоматически через Bot API
async function sendTextRequirements() {
    const requirements = document.getElementById('requirementsText').value.trim();
    
    if (!requirements) {
        tg.showAlert('Пожалуйста, введите требования');
        return;
    }
    
    // Получаем данные пользователя из Telegram
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        tg.showAlert('Ошибка: не удалось получить данные пользователя');
        return;
    }
    
    const chatId = user.id;
    
    // Показываем индикатор отправки
    tg.MainButton.setText('📤 Отправка требований...');
    tg.MainButton.show();
    tg.MainButton.disable();
    
    try {
        // Отправляем требования через Telegram Bot API (если есть токен)
        if (botToken) {
            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: requirements
                    })
                });
                
                const result = await response.json();
                
                if (result.ok) {
                    tg.MainButton.hide();
                    tg.showAlert('✅ Требования успешно отправлены! Бот обработает документ и отправит результат.');
                    
                    // Закрываем Mini App через 2 секунды
                    setTimeout(() => {
                        tg.close();
                    }, 2000);
                    return;
                } else {
                    throw new Error(result.description || 'Ошибка отправки требований');
                }
            } catch (error) {
                console.error('Ошибка отправки через Bot API:', error);
                // Fallback на открытие чата с текстом
            }
        }
        
        // Fallback: открываем чат с готовым текстом (если нет токена)
        tg.MainButton.hide();
        const encodedText = encodeURIComponent(requirements);
        tg.openTelegramLink(`https://t.me/${botUsername}?text=${encodedText}`);
        
        tg.showAlert('✅ Откройте чат и нажмите "Отправить" для отправки требований.');
        
    } catch (error) {
        console.error('Ошибка:', error);
        tg.MainButton.hide();
        tg.showAlert('Ошибка при отправке требований. Попробуйте отправить боту вручную.');
        tg.openTelegramLink(`https://t.me/${botUsername}`);
    }
}

function closeMiniApp() {
    tg.close();
}

