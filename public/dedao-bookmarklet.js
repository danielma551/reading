javascript:(function() {
  // 增加调试信息
  console.log('提取脚本开始执行...');
  
  // 确定是否在得到平台
  const isDedao = window.location.hostname.includes('dedao') || 
               window.location.hostname.includes('igetget') || 
               document.title.includes('得到') ||
               document.body.textContent.includes('得到App');
               
  if (!isDedao) {
    alert('请在"得到"平台的文章页面使用此书签');
    return;
  }
  
  // 添加额外的调试信息到页面上
  const addDebugInfo = (message) => {
    console.log('调试信息: ' + message);
  };
  
  addDebugInfo('开始从得到平台提取内容');
  
  // 尝试提取文章标题和内容
  let title = '';
  let content = '';
  
  // 提取标题
  const titleElements = document.querySelectorAll('h1');
  if (titleElements.length > 0) {
    title = titleElements[0].textContent.trim();
  } else {
    // 备用方案，尝试其他可能的标题元素
    const possibleTitleElements = document.querySelectorAll('.article-title, .column-title, .title');
    if (possibleTitleElements.length > 0) {
      title = possibleTitleElements[0].textContent.trim();
    }
  }
  
  // 如果仍然没有找到标题，请求用户输入
  if (!title) {
    title = prompt('无法自动获取标题，请手动输入文章标题：');
    if (!title) return; // 用户取消
  }
  
  // 提取文章内容 - 完全重写版，使用更全面的方法
  addDebugInfo('开始尝试提取文章内容');
  
  // 全局内容识别方法
  const findArticleContent = () => {
    // 特别针对得到平台的更精确选择器集合 - 优先级从高到低排列
    const articleSelectors = [
      // 得到精确定位选择器
      '.article-core-content', '.article-detail-main', 
      '.ddcontent .content', '.article-detail .article-body',
      '.note-view-content', '.note-view-wrapper .article-content',
      '.note-view-wrapper .ddread-content',
      // 得到专栏/课程文章
      'div.dc-article', '.dc-article-content', '.article-detail', '.course-article',
      // 音频文稿内容
      '.audio-article-content', '.audio-text-content', '.note-reader-content',
      // 电子书阅读器
      '.ebook-reader-content', '.chapter-content', '.book-article-content',
      // 文章细节定位选择器
      'div[class*="article"][class*="content"]', 'div[class*="note"][class*="content"]',
      // 通用文章容器
      '[data-type="article"]', '[role="article"]', '[class*="article"]', '[class*="content"]',
      // 通用段落容器(大容器)
      'article', '.article', '.content', '.rich-text', 'main'
    ];
    
    // 尝试识别主内容区域
    let mainContainer = null;
    let containerScore = 0;
    
    // 1. 首先尝试使用选择器直接查找
    for (const selector of articleSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          // 不选择那些肯定不是主内容的区域
          if (element.offsetHeight < 200) continue;
          if (element.offsetWidth < 200) continue;
          if (element.children.length < 3) continue;
          
          const text = element.textContent.trim();
          if (text.length < 100) continue;
          
          // 是否包含多个段落标记
          const hasParagraphs = element.querySelectorAll('p').length > 3;
          
          // 特别筛选：检测是否可能是课程列表而非文章内容
          const hasMultipleStudyCounts = (text.match(/\d+人学过/g) || []).length > 1;
          const hasMultipleTimeMarks = (text.match(/\d+分\d+秒/g) || []).length > 1;
          const isCourseListing = hasMultipleStudyCounts || hasMultipleTimeMarks;
          
          // 检查是否有长段落，文章内容通常有长段落
          const hasLongParagraph = text.match(/[\u4e00-\u9fa5\.\,\;\:\?\!]{100,}/);
          
          // 根据特征调整分数
          let score = text.length + (hasParagraphs ? 1000 : 0) + (hasLongParagraph ? 2000 : 0);
          
          // 如果看起来像课程列表，大幅减分
          if (isCourseListing) {
            score -= 5000;
          }
          
          if (score > containerScore) {
            mainContainer = element;
            containerScore = score;
          }
        }
        
        if (mainContainer && containerScore > 1000) break;
      } catch (e) {
        console.error('选择器查找错误:', e);
      }
    }
    
    // 2. 如果上述方法失败，尝试启发式查找
    if (!mainContainer || containerScore < 500) {
      addDebugInfo('使用启发式方法查找文章内容');
      
      // 获取所有可能包含内容的块元素
      const contentBlocks = document.querySelectorAll('div, section, article');
      let bestBlock = null;
      let bestScore = 0;
      
      for (const block of contentBlocks) {
        try {
          // 跳过明显不是内容的区域
          if (block.offsetHeight < 200) continue;
          if (block.offsetWidth < 100) continue;
          
          // 计算段落密度得分
          const paragraphs = block.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
          const textLength = block.textContent.trim().length;
          const paragraphDensity = paragraphs.length / (textLength || 1);
          const avgParagraphLength = textLength / (paragraphs.length || 1);
          
          // 理想的段落长度应该在50-800之间
          const isReasonableParagraphLength = avgParagraphLength >= 50 && avgParagraphLength <= 800;
          
          // 计算得分：内容长度 + 段落数 * 100 + 段落密度分数
          let score = textLength + paragraphs.length * 100;
          
          // 如果段落密度和长度都合理，额外加分
          if (isReasonableParagraphLength && paragraphDensity > 0.01 && paragraphDensity < 0.1) {
            score += 5000;
          }
          
          // 如果明显是页脚、版权、导航区域，大幅减分
          if (block.textContent.match(/版权所有|Copyright|客服电话|联系我们|关于我们|APP下载/)) {
            score -= 10000;
          }
          
          if (score > bestScore) {
            bestBlock = block;
            bestScore = score;
          }
        } catch (e) { 
          continue; 
        }
      }
      
      if (bestBlock && bestScore > 500) {
        mainContainer = bestBlock;
        containerScore = bestScore;
      }
    }
    
    // 如果找到内容容器，提取文本
    if (mainContainer) {
      addDebugInfo(`找到主内容区域，得分: ${containerScore}`);
      return extractText(mainContainer);
    }
    
    return null;
  };
  
  // 文本提取和格式化方法 - 增强过滤功能
  const extractText = (container) => {
    // 判断是否可能是课程列表或其他非文章内容 - 简化条件
    const probablyNotArticle = () => {
      // 只在非常确定是列表时才跳过，否则尽量提取
      const text = container.textContent;
      const hasMultipleStudyCounts = (text.match(/\d+人学过/g) || []).length > 5; // 增加到超过5个
      const hasMultipleTimeMarks = (text.match(/\d+分\d+秒/g) || []).length > 5; // 增加到超过5个
      const hasListFormat = (text.match(/第\d+封信/g) || []).length > 5; // 增加到超过5个
      
      // 只有当非常明显是列表时才返回true
      return (hasMultipleStudyCounts && hasMultipleTimeMarks) || hasListFormat;
    };
    
    // 定义更宽松的识别标准
    if (probablyNotArticle()) {
      addDebugInfo('检测到非常明显的课程列表，跳过');
      return '';
    }
    
    // 首先尝试按段落提取
    const paragraphs = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote');
    
    if (paragraphs.length >= 3) {
      // 按段落提取文本，并过滤出网页渲染的特殊格式
      const paragraphTexts = Array.from(paragraphs)
        .map(p => p.textContent.trim())
        .filter(text => 
          // 过滤掉太短的片段
          text.length > 0 &&
          // 过滤掉导航器、标签、页脚等
          !text.match(/^(#|\s*\d+人学过|\s*\d+分\d+秒|\s*\|已学完|\s*\d+\/\s*\d+)/)
        );
      
      // 如果标题行后直接跟着课程列表，尝试识别并过滤
      if (paragraphTexts.length > 0) {
        // 判断是否分成大段的文章，而不是列表
        const isRealArticle = paragraphTexts.some(p => p.length > 100);
        
        if (!isRealArticle) {
          addDebugInfo('未检测到长段落，可能不是文章');
          return '';
        }
      }
      
      return paragraphTexts.join('\n\n');
    } else {
      // 如果段落太少，直接获取容器文本并智能分段
      let text = container.textContent.trim();
      
      // 检查是否是有意义的文章内容
      if (!text.match(/[\u4e00-\u9fa5]{50,}/)) { // 不包含长中文段落
        addDebugInfo('内容不包含长中文段落，可能不是文章');
        return '';
      }
      
      // 移除多余空白
      text = text.replace(/\s+/g, ' ');
      
      // 智能分段 - 针对中文和英文
      text = text
        // 在句号、感叹号、问号后添加双换行
        .replace(/([\u3002\uff01\uff1f\\.!\?])(\s*)/g, '$1\n\n') 
        // 处理多余的换行符
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      
      // 按行分割并过滤掉干扰信息
      const lines = text.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim();
        return trimmedLine.length > 0 && 
               // 过滤掉课程列表的模式
               !trimmedLine.match(/^(\s*\d+人学过|\s*\d+分\d+秒|\s*\|已学完|\s*\d+\/\s*\d+|\s*#)/) &&
               // 过滤掉导航和页脚
               !trimmedLine.match(/正序|倒序|全部话题|\d+人学过$/i);
      });
      
      return filteredLines.join('\n\n');
    }
  };
  
  // 采用更直接的方法提取内容，确保能获取到内容
  
  // 准备多种提取方法
  const extractionMethods = [
    // 方法一：直接获取选中文本
    () => {
      try {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 100) {
          addDebugInfo('使用用户选中的文本');
          return selection.toString().trim();
        }
      } catch (e) { console.error(e); }
      return null;
    },
    
    // 方法二：获取所有段落标签
    () => {
      try {
        const paragraphs = document.querySelectorAll('p');
        if (paragraphs.length > 3) {
          const text = Array.from(paragraphs)
            .map(p => p.textContent.trim())
            .filter(text => text.length > 10) // 去除空段落
            .join('\n\n');
          
          if (text.length > 500) { // 如果有足够的内容
            addDebugInfo('使用段落标签提取内容');
            return text;
          }
        }
      } catch (e) { console.error(e); }
      return null;
    },
    
    // 方法三：寻找内容容器
    () => {
      try {
        // 得到平台常见的内容容器
        const contentSelectors = [
          '.article-body', '.article-content', '.note-content',
          '.content-container', '.note-reader-content', '.ddcontent',
          '.article-detail', '.article__content'
        ];
        
        for (const selector of contentSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            // 选择第一个内容元素
            const contentElement = elements[0];
            const text = contentElement.textContent.trim();
            
            if (text.length > 500) { // 如果有足够的内容
              addDebugInfo(`使用选择器 ${selector} 提取内容`);
              return text;
            }
          }
        }
      } catch (e) { console.error(e); }
      return null;
    },
    
    // 方法四：找出最大的可见内容块
    () => {
      try {
        // 找出所有可见的div和段落
        const contentBlocks = document.querySelectorAll('div, article, section');
        let bestBlock = null;
        let maxTextLength = 0;
        
        for (const block of contentBlocks) {
          // 检查元素是否可见
          const rect = block.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 200) {
            const text = block.textContent.trim();
            // 选择文本最长的元素
            if (text.length > maxTextLength) {
              maxTextLength = text.length;
              bestBlock = block;
            }
          }
        }
        
        if (bestBlock && maxTextLength > 1000) {
          addDebugInfo('使用最大内容块提取内容');
          return bestBlock.textContent.trim();
        }
      } catch (e) { console.error(e); }
      return null;
    },
    
    // 方法五：直接获取页面所有内容
    () => {
      try {
        // 最后的备选方案 - 获取整个文档的内容
        const bodyContent = document.body.textContent.trim();
        if (bodyContent.length > 1000) {
          addDebugInfo('使用整个文档内容');
          return bodyContent;
        }
      } catch (e) { console.error(e); }
      return null;
    }
  ];
  
  // 尝试所有提取方法
  for (const method of extractionMethods) {
    const extractedText = method();
    if (extractedText) {
      content = extractedText;
      break;
    }
  }
  
  // 基本格式化内容
  if (content) {
    // 去除多余的空白字符和换行
    content = content.replace(/\s+/g, ' ');
    // 中文句号后添加换行
    content = content.replace(/([\u3002\uff01\uff1f])\s*/g, '$1\n\n');
    // 英文句号后添加换行
    content = content.replace(/([.!?])\s+/g, '$1\n\n');
    // 去除过多的换行
    content = content.replace(/\n{3,}/g, '\n\n');
    addDebugInfo(`完成内容提取，内容长度: ${content.length}字符`);
  }
  
  // 如果所有方法都失败了，使用最终备用方法
  if (!content) {
    addDebugInfo('主要提取方法失败，尝试备用方法');
    
    // 尝试获取可见文本内容最多的元素
    let bestElement = null;
    let maxTextLength = 0;
    
    // 检查所有深度不超过5的容器元素
    const checkElement = (element, depth = 0) => {
      if (depth > 5) return;
      
      try {
        // 计算当前元素的有效文本长度
        const text = element.textContent.trim();
        const textLength = text.length;
        
        // 排除明显的页脚、导航等非内容区域
        const isNonContent = text.match(/版权所有|Copyright|客服电话|联系我们|关于我们|APP下载/i);
        
        if (textLength > 200 && !isNonContent) {
          // 检查元素是否可见且有合理尺寸
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 100 && rect.height > 100;
          
          if (isVisible && textLength > maxTextLength) {
            maxTextLength = textLength;
            bestElement = element;
          }
        }
        
        // 递归检查子元素
        for (const child of element.children) {
          checkElement(child, depth + 1);
        }
      } catch (e) {
        // 忽略错误
      }
    };
    
    // 从文档主体开始检查
    checkElement(document.body);
    
    if (bestElement && maxTextLength > 200) {
      // 提取文本并格式化
      let rawText = bestElement.textContent.trim();
      
      // 移除网页常见的非内容文本
      const commonNoise = [
        '客服电话', '400-', '版权所有', 'Copyright', '©', '联系我们', '关于我们',
        '点击下载', 'APP下载', '得到App', '网页版功能受限'
      ];
      
      // 移除噪音文本
      commonNoise.forEach(noise => {
        rawText = rawText.replace(new RegExp('.*' + noise + '.*\n?', 'g'), '');
      });
      
      // 格式化内容
      content = rawText
        .replace(/\s+/g, ' ')  // 合并空白
        .replace(/([。！？.!?])(\s*)/g, '$1\n\n')  // 在句号后断行
        .replace(/\n{3,}/g, '\n\n')  // 规范化换行符
        .trim();
      
      addDebugInfo(`备用方法提取内容，长度: ${content.length}字符`);
    }
  }
  
  // 清理内容，移除页脚信息和课程列表信息
  if (content) {
    // 移除常见页脚信息
    content = content.replace(/.*客服电话.*$/m, '');
    content = content.replace(/.*iget@luojilab.com.*$/m, '');
    content = content.replace(/.*得到.*版.*$/gm, '');
    content = content.replace(/.*时间的朋友.*$/m, '');
    content = content.replace(/.*最近使用.*$/m, '');
    
    // 移除列表相关信息
    content = content.replace(/\d+人学过.*/g, '');
    content = content.replace(/\d+分\d+秒.*/g, '');
    content = content.replace(/\s*\|\s*已学完.*/g, '');
    content = content.replace(/\s*\|已学完.*/g, '');
    content = content.replace(/(正序|倒序)\s*/g, '');
    
    // 去除评论区相关内容
    content = content.replace(/我的留言[\s\S]*?\d+\s*\/\s*\d+/g, '');
    content = content.replace(/#[^#\n]+#\s*阅读\d+\s*讨论\d+/g, '');
    
    // 过滤最终空行
    content = content.replace(/\n+\s*$/g, '');
    
    // 检查内容是否有意义
    if (content.length < 100 || !content.match(/[\u4e00-\u9fa5]{100,}/)) {
      addDebugInfo('清理后内容太短或没有足够的中文内容，可能提取失败');
      content = '';
    }
  }
  
  // 如果仍然没有找到内容，显示友好的提示并引导用户手动复制
  if (!content) {
    // 创建一个浮动的提示窗口
    const guideDiv = document.createElement('div');
    guideDiv.style.position = 'fixed';
    guideDiv.style.top = '20%';
    guideDiv.style.left = '25%';
    guideDiv.style.width = '50%';
    guideDiv.style.backgroundColor = '#fff';
    guideDiv.style.padding = '20px';
    guideDiv.style.borderRadius = '8px';
    guideDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    guideDiv.style.zIndex = '10000';
    guideDiv.style.textAlign = 'center';
    guideDiv.style.fontSize = '16px';
    
    guideDiv.innerHTML = `
      <div style="margin-bottom:15px;color:#333;font-weight:bold;font-size:18px;">www.dedao.cn 显示</div>
      <div style="margin-bottom:15px;">无法自动提取文章内容，请手动选择并复制文章内容，然后点击确定</div>
      <button id="guide-paste" style="padding:8px 16px;background:#0066cc;color:#fff;border:none;border-radius:4px;margin-right:10px;cursor:pointer;">手动粘贴内容</button>
      <button id="guide-cancel" style="padding:8px 16px;background:#f0f0f0;color:#333;border:none;border-radius:4px;cursor:pointer;">取消</button>
    `;
    
    document.body.appendChild(guideDiv);
    
    // 设置按钮事件
    document.getElementById('guide-paste').addEventListener('click', function() {
      document.body.removeChild(guideDiv);
      content = prompt('请粘贴文章内容：');
      if (!content) return; // 用户取消
      // 继续处理
      showContentForm();
    });
    
    document.getElementById('guide-cancel').addEventListener('click', function() {
      document.body.removeChild(guideDiv);
      return; // 用户取消
    });
    
    return; // 暂停处理，等待用户操作
  }
  
  // 显示内容编辑表单的函数
  function showContentForm() {
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
    
      // 从当前网址提取专栏名称（如果可能）
      let columnName = '';
      try {
        const urlParts = window.location.pathname.split('/');
        if (urlParts.length > 2) {
          // 假设 URL 格式是 /column/columnname/article
          columnName = urlParts[2] || '';
        }
      } catch (e) {
        console.error('提取专栏名称失败', e);
      }
    
      // 准备要发送的数据
      const data = {
        title: finalTitle,
        content: finalContent,
        source: '得到' + (columnName ? `-${columnName}` : '')
      };
      
      // 显示发送中提示
      const saveButton = document.getElementById('save');
      const originalText = saveButton.textContent;
      saveButton.textContent = '保存中...';
      saveButton.disabled = true;
    
      // 向您的网站API发送数据
      // 请将下面的URL更改为您网站的实际URL
      const apiUrl = 'http://localhost:3001/api/save-dedao-content';
      addDebugInfo('API地址: ' + apiUrl);
    
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
  }
  
  // 如果有内容，直接显示表单
  if (content) {
    showContentForm();
  }
  
})();
