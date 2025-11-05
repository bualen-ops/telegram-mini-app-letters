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

// Переменные для хранения данных о результате
let resultFileId = null;
let resultFileName = null;
let resultFileUniqueId = null;

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
    
    // Открываем чат с готовым текстом, чтобы пользователь отправил сообщение сам
    tg.MainButton.hide();
    const encodedText = encodeURIComponent(requirements);
    
    // Открываем чат с готовым текстом в поле ввода
    tg.openTelegramLink(`https://t.me/${botUsername}?text=${encodedText}`);
    
    tg.showAlert('✅ Чат открыт с готовыми требованиями. Нажмите "Отправить" в чате, чтобы отправить требования боту.');
    
    // Показываем шаг 3 после того, как пользователь вернется
    setTimeout(() => {
        showStep3();
    }, 2000);
}

// Показать шаг 3 (ожидание результата)
function showStep3() {
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step3').style.display = 'block';
    document.getElementById('processingStatus').style.display = 'block';
    document.getElementById('step3').scrollIntoView({ behavior: 'smooth' });
}

// Проверка готовности результата
async function checkForResult() {
    if (!botToken) {
        tg.showAlert('Для получения результата нужен токен бота в URL');
        return;
    }
    
    const user = tg.initDataUnsafe?.user;
    if (!user) {
        return;
    }
    
    const chatId = user.id;
    
    try {
        // Проблема: getUpdates не возвращает исходящие сообщения бота
        // Решение: Используем getUpdates с большим limit и проверяем все сообщения
        // Но лучше использовать другой подход - проверять через channel_post или через webhook callback
        
        // Попытка 1: Получаем последние обновления
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50`, {
            method: 'GET'
        });
        
        const result = await response.json();
        
        if (result.ok && result.result) {
            // Ищем последнее сообщение от бота с документом в нужном чате
            // Проверяем как message, так и channel_post (для каналов)
            for (let i = result.result.length - 1; i >= 0; i--) {
                const update = result.result[i];
                const message = update.message || update.channel_post;
                
                if (message && 
                    message.chat && 
                    String(message.chat.id) === String(chatId)) {
                    
                    // Проверяем, что это сообщение от бота (или любое сообщение с документом)
                    const isFromBot = message.from && message.from.is_bot === true;
                    const botUsernameClean = botUsername.replace('@', '').toLowerCase();
                    const messageFromUsername = message.from?.username?.toLowerCase() || '';
                    
                    // Если это документ от нашего бота или просто документ в нашем чате
                    if (message.document && (isFromBot && messageFromUsername === botUsernameClean || !isFromBot)) {
                        // Нашли документ!
                        resultFileId = message.document.file_id;
                        resultFileName = message.document.file_name || 'edited_document';
                        resultFileUniqueId = message.document.file_unique_id;
                        
                        console.log('✅ Найден документ:', resultFileName);
                        
                        // Показываем результат
                        showResult();
                        return;
                    }
                }
            }
        }
        
        // Попытка 2: Используем getChatHistory (но этот метод недоступен в Bot API)
        // Вместо этого просто сообщаем пользователю, что нужно проверить чат
        
        console.log('Документ еще не найден в обновлениях');
        
    } catch (error) {
        console.error('Ошибка проверки результата:', error);
    }
}

// Показать результат
function showResult() {
    // Останавливаем периодическую проверку
    if (window.resultCheckInterval) {
        clearInterval(window.resultCheckInterval);
        window.resultCheckInterval = null;
    }
    
    document.getElementById('processingStatus').style.display = 'none';
    document.getElementById('resultStatus').style.display = 'block';
    document.getElementById('resultFileInfo').innerHTML = `<p class="hint">📄 ${resultFileName}</p>`;
    
    tg.showAlert('✅ Документ готов! Можете скачать его.');
}

// Скачать результат
async function downloadResult() {
    if (!resultFileId || !botToken) {
        tg.showAlert('Ошибка: файл не найден');
        return;
    }
    
    try {
        // Получаем путь к файлу
        const filePathResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${resultFileId}`);
        const filePathResult = await filePathResponse.json();
        
        if (filePathResult.ok) {
            const filePath = filePathResult.result.file_path;
            const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
            
            // Скачиваем файл
            const fileResponse = await fetch(fileUrl);
            const blob = await fileResponse.blob();
            
            // Создаем ссылку для скачивания
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = resultFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
            tg.showAlert('✅ Файл скачивается!');
        } else {
            throw new Error('Не удалось получить путь к файлу');
        }
    } catch (error) {
        console.error('Ошибка скачивания:', error);
        tg.showAlert('Ошибка при скачивании файла. Попробуйте получить его из чата с ботом.');
    }
}

// Начать новый документ
function startNew() {
    // Сбрасываем состояние
    document.getElementById('fileInput').value = '';
    document.getElementById('requirementsText').value = '';
    
    // Показываем шаг 1
    document.getElementById('step3').style.display = 'none';
    document.getElementById('step2').style.display = 'none';
    document.getElementById('step1').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('uploadArea').style.display = 'block';
    
    // Скроллим вверх
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeMiniApp() {
    tg.close();
}

// Открыть чат с ботом
function openChat() {
    tg.openTelegramLink(`https://t.me/${botUsername}`);
}

