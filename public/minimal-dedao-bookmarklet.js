javascript:(function() {
  // 基本提示
  console.log('极简版得到内容提取器启动');
  
  // 初始化变量
  let title = '';
  let content = '';
  
  // 极简提取标题
  const h1Elements = document.querySelectorAll('h1');
  if (h1Elements.length > 0) {
    title = h1Elements[0].textContent.trim();
  } else {
    title = document.title.replace(' - 得到', '').trim();
  }
  
  // 如果仍然没有标题，让用户输入
  if (!title) {
    title = prompt('无法自动获取标题，请手动输入文章标题：');
    if (!title) return; // 用户取消
  }
  
  // 先尝试获取用户选择的文本
  const selection = window.getSelection();
  if (selection && selection.toString().trim().length > 100) {
    content = selection.toString().trim();
    console.log('检测到用户选择的文本内容');
  } else {
    // 极简版内容提取 - 尝试不同的方法直到有内容
    
    // 方法1：直接获取所有段落
    const paragraphs = document.querySelectorAll('p');
    if (paragraphs.length > 5) {
      content = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => text.length > 0)
        .join('\\n\\n');
    }
    
    // 方法2：获取主要内容区域
    if (!content || content.length < 100) {
      const contentContainers = [
        '.article-content', '.note-content', '.content-container',
        '.article-detail', '.note-reader-content', '.ddcontent',
        '.article__content', '.article-reader', 'article', 
        '.article', '.content', '.main-content'
      ];
      
      for (const selector of contentContainers) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            // 选择最长的内容元素
            let bestElement = elements[0];
            let maxLength = bestElement.textContent.length;
            
            for (let i = 1; i < elements.length; i++) {
              if (elements[i].textContent.length > maxLength) {
                bestElement = elements[i];
                maxLength = elements[i].textContent.length;
              }
            }
            
            if (bestElement && bestElement.textContent.trim().length > 200) {
              content = bestElement.textContent.trim();
              break;
            }
          }
        } catch (e) {
          console.error('提取失败:', e);
        }
      }
    }
    
    // 方法3：获取最长的可见div
    if (!content || content.length < 100) {
      const allDivs = document.querySelectorAll('div');
      let bestDiv = null;
      let maxLength = 0;
      
      for (const div of allDivs) {
        if (div.offsetWidth > 200 && div.offsetHeight > 200) {
          const text = div.textContent.trim();
          if (text.length > maxLength) {
            maxLength = text.length;
            bestDiv = div;
          }
        }
      }
      
      if (bestDiv && maxLength > 500) {
        content = bestDiv.textContent.trim();
      }
    }
  }
  
  // 简单格式化内容
  if (content) {
    // 删除多余空白行
    content = content.replace(/\\n{3,}/g, '\\n\\n');
    // 简单合并空格
    content = content.replace(/\\s+/g, ' ');
  }
  
  // 如果仍然没有找到内容，让用户手动复制
  if (!content || content.length < 100) {
    alert('无法自动提取文章内容，请手动选择并复制文章内容，然后点击确定');
    content = prompt('请粘贴文章内容：');
    if (!content) return; // 用户取消
  }
  
  // 创建一个表单来显示提取的内容并确认
  const form = document.createElement('form');
  form.style.position = 'fixed';
  form.style.top = '10%';
  form.style.left = '10%';
  form.style.width = '80%';
  form.style.maxHeight = '80%';
  form.style.backgroundColor = 'white';
  form.style.padding = '20px';
  form.style.borderRadius = '5px';
  form.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
  form.style.zIndex = '10000';
  form.style.overflow = 'auto';
  
  form.innerHTML = `
    <h2 style="margin-top:0;">保存到我的阅读网站</h2>
    <div style="margin-bottom:10px;">
      <label for="title" style="display:block;margin-bottom:5px;font-weight:bold;">标题:</label>
      <input type="text" id="title" value="${title.replace(/"/g, '&quot;')}" style="width:100%;padding:8px;box-sizing:border-box;">
    </div>
    <div style="margin-bottom:10px;">
      <label for="content" style="display:block;margin-bottom:5px;font-weight:bold;">内容:</label>
      <textarea id="content" style="width:100%;height:300px;padding:8px;box-sizing:border-box;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
    </div>
    <div style="text-align:right;">
      <button type="button" id="cancel" style="padding:8px 15px;margin-right:10px;background:#f0f0f0;border:none;border-radius:3px;cursor:pointer;">取消</button>
      <button type="button" id="save" style="padding:8px 15px;background:#0066cc;color:white;border:none;border-radius:3px;cursor:pointer;">保存</button>
    </div>
  `;
  
  document.body.appendChild(form);
  
  // 设置按钮事件
  document.getElementById('cancel').addEventListener('click', function() {
    document.body.removeChild(form);
  });
  
  document.getElementById('save').addEventListener('click', function() {
    // 获取最终值
    const finalTitle = document.getElementById('title').value.trim();
    const finalContent = document.getElementById('content').value.trim();
    
    if (!finalTitle || !finalContent) {
      alert('标题和内容不能为空');
      return;
    }
    
    // 准备要发送的数据
    const data = {
      title: finalTitle,
      content: finalContent,
      source: '得到'
    };
    
    // 显示发送中提示
    const saveButton = document.getElementById('save');
    const originalText = saveButton.textContent;
    saveButton.textContent = '保存中...';
    saveButton.disabled = true;
    
    // 向您的网站API发送数据
    const apiUrl = 'http://localhost:3001/api/save-dedao-content';
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(`文章已成功保存为 "${result.fileName}"！`);
        document.body.removeChild(form);
      } else {
        alert(`保存失败: ${result.message || '未知错误'}`);
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }
    })
    .catch(error => {
      alert(`发送请求时出错: ${error.message || '未知错误'}`);
      console.error('保存失败', error);
      saveButton.textContent = originalText;
      saveButton.disabled = false;
    });
  });
})();
