// /Users/danielma/Downloads/text/pages/api/search.js
import { exec } from 'child_process';
import path from 'path';

// Python 解释器的路径 (根据需要调整，或者如果 python 在 PATH 中则直接使用 'python')
const PYTHON_EXECUTABLE = 'python'; // 或者 'python3'
// search_index.py 脚本的路径
const SCRIPT_PATH = path.join(process.cwd(), 'search_index.py');
// 文本文件目录（确保与 search_index.py 中的默认值一致）
const TEXTS_DIR = path.join(process.cwd(), 'public', 'uploaded_texts');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: '仅允许 GET 方法' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ message: '缺少查询参数 "q"' });
  }

  // 构建执行 Python 脚本的命令
  // 注意：需要对查询参数 q 进行适当的转义，防止命令注入
  // 使用 exec 的参数传递功能通常更安全，但这里为了简单起见，
  // 假设 q 不包含恶意字符，或者在生产环境中应添加更严格的清理/转义。
  // 更安全的方式是使用 execFile 或 spawn，并将参数作为数组传递。
  // 暂时使用 exec 并假设 q 是安全的简单文本。
  // 基本的引号转义，并确保 texts_dir 也被引用
  const command = `${PYTHON_EXECUTABLE} "${SCRIPT_PATH}" --query "${q.replace(/"/g, '\\"')}" --texts_dir "${TEXTS_DIR}"`;

  console.log(`Executing command: ${command}`); // 记录将要执行的命令

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`执行 Python 脚本出错: ${error}`);
      console.error(`stderr: ${stderr}`);
      // 尝试解析 stderr 是否包含 Python 脚本打印的 JSON 错误
      try {
          // 检查 stderr 是否包含任何内容
          if (stderr && stderr.trim()) {
              const pyError = JSON.parse(stderr);
              if (pyError.error) {
                  return res.status(500).json({ message: `搜索脚本错误: ${pyError.error}` });
              }
          }
      } catch (parseError) {
          // stderr 不是 JSON 或解析失败
          console.error(`解析 stderr 失败: ${parseError}`);
      }
      return res.status(500).json({ message: '服务器内部错误：执行搜索脚本失败', details: stderr || error.message });
    }

    // 检查 stderr 是否包含 Python 脚本打印的 JSON 警告
     if (stderr && stderr.trim()) {
        try {
            // 尝试逐行解析 JSON，因为可能有多个警告
            const lines = stderr.trim().split('\n');
            lines.forEach(line => {
                try {
                    const pyWarning = JSON.parse(line);
                    if (pyWarning.warning) {
                         console.warn(`搜索脚本警告: ${pyWarning.warning}`);
                         // 可以选择是否将警告传递给前端，这里暂时只在后端记录
                    }
                } catch (lineParseError) {
                    // 忽略无法解析为 JSON 的行
                    console.warn(`搜索脚本产生了非 JSON stderr 行: ${line}`);
                }
            });
        } catch (parseError) {
             // 如果整个 stderr 解析失败（理论上不应发生，因为上面是逐行解析）
             console.warn(`搜索脚本产生了无法解析的 stderr: ${stderr}`);
        }
    }

    try {
      // Python 脚本应该将 JSON 结果打印到 stdout
      // 确保 stdout 不为空
      if (!stdout || !stdout.trim()) {
          console.warn("Python 脚本的 stdout 为空，可能没有找到结果或没有输出。");
          return res.status(200).json([]); // 返回空数组表示没有结果
      }
      const results = JSON.parse(stdout);
      return res.status(200).json(results);
    } catch (parseError) {
      console.error(`解析 Python 脚本输出失败: ${parseError}`);
      console.error(`stdout: ${stdout}`);
      return res.status(500).json({ message: '服务器内部错误：无法解析搜索结果' });
    }
  });
}
