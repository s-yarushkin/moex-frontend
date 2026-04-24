# MOEX OI Viewer

Веб-интерфейс для визуального анализа открытого интереса по фьючерсам MOEX.

## Архитектура

Frontend обращается не напрямую к MOEX, а к backend proxy:

- Frontend: React + Vite + Recharts
- Backend: Render
- Backend URL: `https://moex-backend.onrender.com`

API-ключ MOEX хранится только на backend. Во frontend ключ не хранится.

## Локальный запуск

```bash
npm install
npm run dev
```

Обычно приложение открывается на `http://localhost:5173`.

## Production-сборка

```bash
npm run build
npm run preview
```

По умолчанию frontend использует:

```bash
VITE_BACKEND_URL=https://moex-backend.onrender.com
```

## GitHub Pages

В репозитории добавлен workflow для автопубликации через GitHub Pages.

Ожидаемый URL публикации:

```text
https://s-yarushkin.github.io/moex-frontend/
```

Если страница ещё не открывается, проверь в GitHub:

1. `Settings` → `Pages`
2. `Source` → `GitHub Actions`
3. Дождись завершения workflow `Deploy GitHub Pages` во вкладке `Actions`

## Важно

Статический frontend работает через Render backend proxy. Прямой вызов `apim.moex.com` из GitHub Pages не используется.
