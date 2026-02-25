const express = require('express')
const fetch = require('node-fetch')
const fs = require('fs').promises
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const path = require('path')
const cors = require('cors')

            
const app = express()
const PORT = 3000
const JWT_SECRET = 'your-secret-key-change-this' // 实际应用中要用环境变量
    // 中间件
        // 自动把传来的字符串转化为json对象。
app.use(express.json());
    // 托管根目录和public文件夹，请注意托管根目录并不允许同时托管子文件夹
app.use(express.static('public'))
app.use(express.static(__dirname))
app.use(cors())
    //托管静态仓库，正确操作是专门搞一个public文件夹，然后把css文件丢进去，而不是像这样直接托管根目录
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
})


// ==================== 数据文件操作 ====================
// 数据库路径
const DATA_DIR = path.join(__dirname, 'data')

// 确保数据存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true })
    } catch (err) {
        console.log('数据目录已存在')
    }
}

// 读取数据
async function readDataFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename)
        const data = await fs.readFile(filePath, 'utf8')
        return JSON.parse(data)
    } catch (err) {
        // 如果文件不存在，返回默认值
        if (filename === 'users.json') return []
        if (filename === 'posts.json') return []
        if (filename === 'likes.json') return {}
        return []
    }
}

// 写入数据文件
async function writeDataFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}

// ==================== 中间件：验证 Token ====================
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
        return res.status(401).json({ error: '未登录' })
    }
    
    try {
        const user = jwt.verify(token, JWT_SECRET)
        req.user = user
        next()
    } catch (err) {
        return res.status(403).json({ error: 'token 无效' })
    }
}


// ==================== 用户相关接口（添加路由），路由：如果访问.../...则触发function{....} ====================
// 注册
// /api/register是 URL 路径,# 如果前端访问http://localhost:3000/api/register，就会触发下列代码。
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body
        
        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' })
        }
        
        // 读取用户数据，位于.data/users.json
        const users = await readDataFile('users.json')
        
        // 检查用户是否已存在
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: '用户名已存在' })
        }
        
        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10)
        
        // 创建新用户
        const newUser = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        }
        
        users.push(newUser)
        await writeDataFile('users.json', users)
        
        // 生成 token
        // 每7d重新登录
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        )
        
        res.json({
            message: '注册成功',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: '服务器错误' })
    }
})

// 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body
        
        const users = await readDataFile('users.json')
        const user = users.find(u => u.username === username)
        
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }
        
        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' })
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        )
        
        res.json({
            message: '登录成功',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: '服务器错误' })
    }
})

// 获取当前用户信息
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const users = await readDataFile('users.json')
        const user = users.find(u => u.id === req.user.id)
        
        if (!user) {
            return res.status(404).json({ error: '用户不存在' })
        }
        
        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.createdAt
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: '服务器错误' })
    }
})




            //监听3000端口
async function startServer() {
    await ensureDataDir()
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`)
        console.log(`注册接口: http://localhost:${PORT}/api/register`)
        console.log(`登录接口: http://localhost:${PORT}/api/login`)
    })
}

startServer()