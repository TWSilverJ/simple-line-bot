import axios from 'axios'
import dotenv from 'dotenv'
import express from 'express'
import logger from 'morgan'
import crypto from 'node:crypto'

// 從環境變數導入應用程式設定
dotenv.config()
const { env } = process
const port = Number(env.PORT)
const appURL = env.APP_URL
const channelAccessToken = env.CHANNEL_ACCESS_TOKEN
const channelSecret = env.CHANNEL_SECRET

// 建立 HTTP Client
const httpClient = axios.create({
    baseURL: 'https://api.line.me/v2/',
    headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
    }
})

// 實作 express
const app = express()
app.use(logger('dev'))
app.use(express.json({ limit: '2mb' }))

// 路由
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hello world!' })
})

// 接收 Line Webhook
app.post('/webhook', async (req, res) => {
    // 取得數位簽章
    const signature = req.header('x-line-signature')
    if (!signature) {
        res.status(403).json({ message: '數位簽章無效' })
        return
    }

    // 取得訊息內容
    const body = req.body
    const rawBody = JSON.stringify(body)

    // 檢查數位簽章
    const a = crypto.createHmac('SHA256', channelSecret).update(rawBody).digest()
    const b = Buffer.from(signature, 'base64')
    const result = a.length === b.length && crypto.timingSafeEqual(a, b)
    if (!result) {
        res.status(403).json({ message: '數位簽章無效' })
        return
    }

    // 顯示訊息內容
    console.log(body)

    // 事件處理
    for (const event of body.events) {
        const messages = []

        try {
            // 依照事件類別對應處理方法
            switch (event.type) {
                case 'message':
                    if (event.message.type === 'text') {
                        messages.push({ type: 'text', text: event.message.text })
                    }
                    break

                case 'follow':
                    messages.push({ type: 'text', text: '您好，感謝您追蹤本頻道，現在是鸚鵡模式' })
                    break
            }

            // 回覆訊息
            if (messages.length > 0) {
                const response = await httpClient.post('/bot/message/reply', {
                    replyToken: event.replyToken,
                    messages
                })
                console.log(new Date().toISOString(), response.data)
            }

        } catch (error) {
            console.error(new Date().toISOString(), error.message)
        }
    }

    // 回覆 OK
    res.status(200).json({ message: 'OK' })
    return
})

// 監聽電腦指定 port
app.listen(port, async () => {
    // 檢查並更新 Line webhook URL endpoint
    const endpoint = `${appURL}/webhook`
    let response = await httpClient.get('/bot/channel/webhook/endpoint')
    if (response.data.endpoint != endpoint) {
        const response = await httpClient.put('/bot/channel/webhook/endpoint', { endpoint })
        console.log(new Date().toISOString(), response.data)
    }

    console.log(new Date().toISOString(), '伺服器啟動')

    // 測試 Line webhook URL endpoint
    response = await httpClient.post('/bot/channel/webhook/test')
    console.log(new Date().toISOString(), response.data)
})
