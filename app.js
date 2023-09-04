import express from 'express'
import logger from 'morgan'

// 實作 express
const app = express()
app.use(logger('dev'))
app.use(express.json({ limit: '2mb' }))

// 路由
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hello world!' })
})

// 監聽電腦指定 port
app.listen(3000, async () => {
    console.log(new Date().toISOString(), '伺服器啟動')
})
