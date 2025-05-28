#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const net = require('net');
const { promisify } = require('util');
const tcpPortUsed = require('tcp-port-used');
const fs = require('fs');
const path = require('path');

// 检查我们是否需要安装 tcp-port-used 模块
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
const tcpPortUsedPath = path.join(nodeModulesPath, 'tcp-port-used');

if (!fs.existsSync(tcpPortUsedPath)) {
  console.log('正在安装依赖模块: tcp-port-used...');
  try {
    execSync('npm install tcp-port-used --no-save', { stdio: 'inherit' });
    console.log('安装成功!');
  } catch (error) {
    console.error('安装依赖模块失败，将使用备用方法检测端口');
  }
}

// 更可靠的端口检测方法
async function isPortInUse(port) {
  try {
    // 尝试使用 tcp-port-used 模块
    if (fs.existsSync(tcpPortUsedPath)) {
      return await tcpPortUsed.check(port, '127.0.0.1');
    }
    
    // 备用方法：使用原生 net 模块
    return new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', err => {
          if (err.code === 'EADDRINUSE') {
            resolve(true); // 端口被占用
          } else {
            // 其他错误，假设端口可用
            resolve(false);
          }
        })
        .once('listening', () => {
          tester.once('close', () => resolve(false)) // 端口可用
                .close();
        })
        .listen(port, '127.0.0.1');
        
      // 设置超时，防止检测过程卡住
      setTimeout(() => {
        try {
          tester.close();
        } catch (e) {}
        resolve(true); // 超时假设端口被占用
      }, 1000);
    });
  } catch (error) {
    console.error(`检测端口 ${port} 时出错:`, error);
    return true; // 出错时假设端口被占用
  }
}

// 查找可用端口
async function findAvailablePort(startPort, endPort) {
  console.log(`正在检测端口范围: ${startPort}-${endPort}...`);
  
  for (let port = startPort; port <= endPort; port++) {
    process.stdout.write(`检测端口 ${port}... `);
    const inUse = await isPortInUse(port);
    if (inUse) {
      console.log('已被占用');
    } else {
      console.log('可用!');
      // 再次确认端口可用
      const doubleCheck = await isPortInUse(port);
      if (!doubleCheck) {
        return port;
      } else {
        console.log(`端口 ${port} 在再次检测时被占用，继续检测...`);
      }
    }
  }
  
  // 如果指定范围内所有端口都被占用，尝试在更大范围内找一个随机端口
  const randomPort = 8000 + Math.floor(Math.random() * 2000); // 8000-9999
  console.log(`所有指定端口都被占用，尝试随机端口 ${randomPort}...`);
  
  const randomPortInUse = await isPortInUse(randomPort);
  if (!randomPortInUse) {
    return randomPort;
  }
  
  // 如果随机端口也被占用，尝试在更大范围内找一个可用端口
  return findAvailablePort(10000, 65535);
}

// 主函数
async function main() {
  try {
    // 尝试端口范围：3000-3010
    const port = await findAvailablePort(3000, 3010);
    console.log(`找到可用端口: ${port}`);
    
    // 使用 spawn 而不是 execSync 启动 Next.js 开发服务器
    console.log(`正在启动 Next.js 开发服务器，端口: ${port}...`);
    
    // 分解命令为数组
    const nextBin = path.join(process.cwd(), 'node_modules', '.bin', 'next');
    const nextProcess = spawn(nextBin, ['dev', '-p', port.toString(), '-H', '0.0.0.0'], {
      stdio: 'inherit',
      shell: process.platform === 'win32' // Windows 需要 shell
    });
    
    // 处理进程退出
    nextProcess.on('close', (code) => {
      if (code !== 0) {
        console.log(`Next.js 进程退出，退出码: ${code}`);
      }
      process.exit(code);
    });
    
    // 处理进程错误
    nextProcess.on('error', (err) => {
      console.error('启动 Next.js 进程时出错:', err);
      process.exit(1);
    });
    
    // 处理主进程的信号
    process.on('SIGINT', () => {
      console.log('\n收到终止信号，正在关闭 Next.js 进程...');
      nextProcess.kill('SIGINT');
    });
    
    process.on('SIGTERM', () => {
      console.log('\n收到终止信号，正在关闭 Next.js 进程...');
      nextProcess.kill('SIGTERM');
    });
  } catch (error) {
    console.error('启动开发服务器时出错:', error);
    process.exit(1);
  }
}

main();
