// scripts/deploy-server.js
// รัน: node scripts/deploy-server.js
// ต้องรันบน HOST machine (ไม่ใช่ใน Docker)

const http = require('http')
const { exec } = require('child_process')
const path = require('path')

const PORT = process.env.DEPLOY_PORT || 9901
const PROJECT_DIR = path.resolve(__dirname, '..')

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function runCommand(cmd, res) {
  console.log(`[deploy] Running: ${cmd}`)
  exec(cmd, { cwd: PROJECT_DIR }, (error, stdout, stderr) => {
    const output = (stdout + stderr).trim()
    console.log(`[deploy] Output:\n${output}`)
    cors(res)
    res.writeHead(error ? 500 : 200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: !error, output }))
  })
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    cors(res)
    res.writeHead(204)
    res.end()
    return
  }

  const url = req.url?.split('?')[0]

  if (req.method === 'POST' && url === '/git-pull') {
    runCommand('git pull', res)
    return
  }

  if (req.method === 'POST' && url === '/docker-restart') {
    runCommand('docker compose up -d --build nextjs', res)
    return
  }

  if (req.method === 'POST' && url === '/deploy') {
    // git pull แล้ว docker compose ต่อกัน
    exec('git pull', { cwd: PROJECT_DIR }, (err, stdout, stderr) => {
      const gitOutput = (stdout + stderr).trim()
      if (err) {
        cors(res)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, output: `[git pull]\n${gitOutput}` }))
        return
      }
      exec('docker compose up -d --build nextjs', { cwd: PROJECT_DIR }, (err2, stdout2, stderr2) => {
        const dockerOutput = (stdout2 + stderr2).trim()
        cors(res)
        res.writeHead(err2 ? 500 : 200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: !err2,
          output: `[git pull]\n${gitOutput}\n\n[docker compose]\n${dockerOutput}`
        }))
      })
    })
    return
  }

  cors(res)
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))

}).listen(PORT, '127.0.0.1', () => {
  console.log(`Deploy server running on http://127.0.0.1:${PORT}`)
  console.log(`Project directory: ${PROJECT_DIR}`)
})
