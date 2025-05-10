// IndexedDB 存儲工具
// 提供比 localStorage 更大的存儲容量

// 數據庫配置
const DB_NAME = 'readingNotesDB';
const DB_VERSION = 1;
const NOTES_STORE = 'savedSentences';

/**
 * 打開數據庫連接
 * @returns {Promise} 數據庫連接
 */
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('數據庫打開失敗:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 如果存儲對象不存在，則創建一個新的
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        // 使用 id 作為索引鍵
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * 從 localStorage 遷移數據到 IndexedDB
 * @returns {Promise<boolean>} 是否成功遷移
 */
export async function migrateFromLocalStorage() {
  try {
    // 檢查是否需要遷移
    const migrated = localStorage.getItem('migratedToIndexedDB');
    if (migrated === 'true') {
      return true;
    }
    
    // 從 localStorage 獲取筆記
    const savedSentencesJson = localStorage.getItem('savedSentences');
    if (!savedSentencesJson) {
      // 沒有數據需要遷移
      localStorage.setItem('migratedToIndexedDB', 'true');
      return true;
    }
    
    const savedSentences = JSON.parse(savedSentencesJson);
    
    // 保存到 IndexedDB
    const db = await openDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    
    // 添加每條筆記
    for (const sentence of savedSentences) {
      store.add(sentence);
    }
    
    // 等待事務完成
    return new Promise((resolve) => {
      transaction.oncomplete = () => {
        console.log(`成功從 localStorage 遷移 ${savedSentences.length} 條筆記到 IndexedDB`);
        // 標記已遷移
        localStorage.setItem('migratedToIndexedDB', 'true');
        resolve(true);
      };
      
      transaction.onerror = (event) => {
        console.error('遷移數據失敗:', event.target.error);
        resolve(false);
      };
    });
  } catch (error) {
    console.error('遷移過程發生錯誤:', error);
    return false;
  }
}

/**
 * 保存筆記到 IndexedDB
 * @param {Object} sentence 要保存的筆記對象
 * @returns {Promise<Object>} 保存結果
 */
export async function saveToIndexedDB(sentence) {
  try {
    const db = await openDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    
    // 添加筆記
    const request = store.add(sentence);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve({
          success: true,
          message: '筆記已保存',
          sentence
        });
      };
      
      request.onerror = (event) => {
        console.error('保存筆記失敗:', event.target.error);
        resolve({
          success: false,
          message: '保存失敗，請重試',
          error: event.target.error
        });
      };
    });
  } catch (error) {
    console.error('保存過程發生錯誤:', error);
    return {
      success: false,
      message: '保存失敗，請重試',
      error
    };
  }
}

/**
 * 從 IndexedDB 獲取所有筆記
 * @returns {Promise<Array>} 所有筆記的數組
 */
export async function getAllFromIndexedDB() {
  try {
    const db = await openDB();
    const transaction = db.transaction(NOTES_STORE, 'readonly');
    const store = transaction.objectStore(NOTES_STORE);
    
    // 獲取所有筆記
    const request = store.getAll();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('獲取筆記失敗:', event.target.error);
        resolve([]);
      };
    });
  } catch (error) {
    console.error('獲取過程發生錯誤:', error);
    return [];
  }
}

/**
 * 從 IndexedDB 刪除指定筆記
 * @param {string} id 要刪除的筆記ID
 * @returns {Promise<Object>} 刪除結果
 */
export async function deleteFromIndexedDB(id) {
  try {
    const db = await openDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    
    // 刪除筆記
    const request = store.delete(id);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve({
          success: true,
          message: '筆記已刪除'
        });
      };
      
      request.onerror = (event) => {
        console.error('刪除筆記失敗:', event.target.error);
        resolve({
          success: false,
          message: '刪除失敗，請重試',
          error: event.target.error
        });
      };
    });
  } catch (error) {
    console.error('刪除過程發生錯誤:', error);
    return {
      success: false,
      message: '刪除失敗，請重試',
      error
    };
  }
}

/**
 * 清空 IndexedDB 中的所有筆記
 * @returns {Promise<Object>} 清空結果
 */
export async function clearAllFromIndexedDB() {
  try {
    const db = await openDB();
    const transaction = db.transaction(NOTES_STORE, 'readwrite');
    const store = transaction.objectStore(NOTES_STORE);
    
    // 清空存儲
    const request = store.clear();
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve({
          success: true,
          message: '所有筆記已清空'
        });
      };
      
      request.onerror = (event) => {
        console.error('清空筆記失敗:', event.target.error);
        resolve({
          success: false,
          message: '清空失敗，請重試',
          error: event.target.error
        });
      };
    });
  } catch (error) {
    console.error('清空過程發生錯誤:', error);
    return {
      success: false,
      message: '清空失敗，請重試',
      error
    };
  }
}
