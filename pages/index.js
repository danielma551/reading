import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [formattedText, setFormattedText] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
        formatText(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  const formatText = (inputText) => {
    const sentences = inputText.split(/([，。？；])/g)
      .filter(s => s.trim())
      .map(s => s.trim())
      .join('\n');
    setFormattedText(sentences);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-3xl font-bold mb-8 text-center">文本格式转换器</h1>
                <div className="mb-8">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    上传TXT文件
                  </label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:shadow-outline"
                  />
                </div>
                {formattedText && (
                  <div>
                    <h2 className="text-xl font-bold mb-4">转换结果：</h2>
                    <pre className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                      {formattedText}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 